import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import 'jspdf-autotable'
import { JsPDFService } from 'app/shared/service/pdf.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { SortProp } from 'app/shared/interface/sort';
import { CsvService } from 'app/shared/service/csv.service';
import { Child } from '../../child/child.model';
import { ReportDependencyervice } from './report-dependencey.service';
import {BuslistReportModel} from '../buslist-reports/model/buslist-report.model';
import {BusAttendanceReportModel} from '../buslist-reports/model/bus-attendance-report.model';
import {PDFHelperService} from '../../../../shared/service/pdf-helper.service';
import {AuthService} from '../../../../shared/service/auth.service';
import {DateTimeHelper} from '../../../../utils/date-time.helper';
import {DailyBuslistReportModel} from '../buslist-reports/model/daily-buslist-report.model';



@Injectable()
export class BuslistReportService implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;
    busAttendanceReport: BusAttendanceReportModel[];
    report: BuslistReportModel[];
    dailyReport: DailyBuslistReportModel[];
    busListReportRawData: any[];
    children: Child[];
    onReportChanged: BehaviorSubject<any>;
    onChildrenChanged: BehaviorSubject<any>;
    onChildChanged: BehaviorSubject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;


    defaultPageIndex: any = 1;
    defaultPageSize: any = 5;
    defaultPageSizeOptions: number[] = [5, 10, 20];

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    field:any = [];
    buslistField:any = [];
    dailyBuslistField:any = [];
    reportType:string = null;
    reportHeading: string;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param _childrenService
     * @param _roomService
     * @param _pdfService
     * @param _pdfHelperService
     * @param _csvService
     * @param _notification
     * @param _reportDependencyervice
     * @param _authService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _pdfService: JsPDFService,
        private _pdfHelperService: PDFHelperService,
        private _csvService: CsvService,
        private _notification: NotificationService,
        private _reportDependencyervice:ReportDependencyervice,
        private _authService: AuthService
    ) {
        // Set the defaults
        this.busAttendanceReport = [];
        this.report = [];
        this._unsubscribeAll = new Subject();
        this.onSortChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onReportChanged = new BehaviorSubject([]);
        this.onChildrenChanged = new BehaviorSubject([]);
        this.onChildChanged = new BehaviorSubject([]);
        this.field = [{name: 'Date', res: 'date'},
            {name: 'Child Name', res: 'childName'},
            {name: 'Bus Name', res: 'bus'},
            {name: 'School Name', res: 'school'},
            {name: 'Dropped User', res: 'dropUserName'},
            {name: 'Dropped Time', res: 'dropTime'},
            {name: 'Picked User', res: 'pickUserName'},
            {name: 'Picked Time', res: 'pickTime'},
            {name: 'Absence/Attending?', res: 'type'},
        ]
        this.buslistField = [
            {name: 'Child Name', res: 'childName'},
            {name: 'Home Phone', res: 'homePhone'},
            {name: 'Work Phone', res: 'workPhone'},
            {name: 'Mobile', res: 'phoneNumber'},
            {name: 'Monday', res: 'monday'},
            {name: 'Tuesday', res: 'tuesday'},
            {name: 'Wednesday', res: 'wednesday'},
            {name: 'Thursday', res: 'thursday'},
            {name: 'Friday', res: 'friday'},
            /*{name: 'Saturday', res: 'saturday'},
            {name: 'Sunday', res: 'sunday'}*/
        ]

        this.dailyBuslistField = [
            {name: 'Child Name', res: 'childName'},
            {name: 'Home Phone', res: 'homePhone'},
            {name: 'Work Phone', res: 'workPhone'},
            {name: 'Mobile', res: 'phoneNumber'},
            {name: 'Booking', res: 'booking'},
        ]
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resolver
     *
     * @param {ActivatedRouteSnapshot} route
     * @param {RouterStateSnapshot} state
     * @returns {Observable<any> | Promise<any> | any}
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {

        return new Promise((resolve, reject) => {
            Promise.all([
                this._reportDependencyervice.getAllRooms(),
                this._reportDependencyervice.getAllBusses()
            ])
                .then(([room, bus]: [any, any]) => {

                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }


    viewReports(data: object,getSelectedField: any = null ): Observable<any>
    {
        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-bus-attendance-report`,data)
            .pipe(
                map(response => 
                {
                    if (response.data)
                    {
                      
                        this.busAttendanceReport = response.data.map((i: any, idx: number) => new BusAttendanceReportModel(i, idx, (response.allrooms || '')));
                        this.totalRecords = response.totalRecords;
                    }

                    setTimeout(() => this.onReportChanged.next({
                        records: this.busAttendanceReport,
                        total: this.totalRecords,
                        selectedField: this.field,
                        type: this.reportType
                    }), 500);
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    getDataForReport(data: object, isPdf: boolean, reportType: string = null): Observable<any>
    {
        if(reportType === 'busListReport' || reportType === 'busListReportDaily')
        {
            return this._httpClient
                .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-buslist-report`,data)
                .pipe(
                    map(response =>
                    {
                        if (response.data)
                        {
                            this.busListReportRawData = response.data;
                            this.totalRecords = response.totalRecords;
                        }

                        setTimeout(() => {
                            // isPdf ? this.downLoadPdfBusList('Bus List Report', data['sdate'], data['edate'], data['room_name'], data['bus_name']) : this.downLoadCsv('Bus List Report', this.field);
                            (reportType === 'busListReport') ? this.downLoadPdfBusList('Bus List Report', data['sdate'], data['edate'], data['room_name'], data['bus_name']) : this.downLoadPdfBusListDaily('Bus List Report', data['sdate'], data['edate'], data['room_name'], data['bus_name']);
                        }, 500);
                        return response.message;
                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                );
        }
        else
        {
            return this._httpClient
                .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-bus-attendance-report`,data)
                .pipe(
                    map(response =>
                    {
                        if (response.data)
                        {
                            this.busAttendanceReport = response.data.map((i: any, idx: number) => new BusAttendanceReportModel(i, idx, (response.allrooms || '')));
                            this.totalRecords = response.totalRecords;
                        }

                        setTimeout(() => {
                            isPdf ? this.downLoadPdf('Bus Attendance Report', data['sdate'], data['edate']) : this.downLoadCsv('Bus Attendance Report', this.field);
                        }, 500);
                        return response.message;
                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                );
        }
    }

    getPrintViewContent(field: any, report:BusAttendanceReportModel[]): Array<any>
    {
        const data: Array<any> = [];
        const headers: Array<any> = [];
        _.map(field, (val)=>{
            headers.push(
                {text: val.name, color: '#ffffff', fillColor: '#009fe9'}
            )
        })
        data.push(headers);
        _.map(report, (reo) => {
            const rows: Array<any> = [];
            _.map(field, (fe) => {
                rows.push(
                    reo.getValue(fe['res']),
                )
            })
            data.push(rows);
        })
        return data;
    }

    getPrintViewContentBusList(field: any, report:BuslistReportModel[]): Array<any>
    {
        const data: Array<any> = [];
        const headers: Array<any> = [];
        _.map(field, (val)=>{
            headers.push(
                {text: val.name, style: 'boldTd' }
            )
        })
        data.push(headers);
        _.map(report, (reo) => {
            const rows: Array<any> = [];
            _.map(field, (fe) => {
                rows.push(
                    reo.getValue(fe['res']),
                )
            })
            data.push(rows);
        })
        return data;
    }

    getPrintViewContentBusListDaily(field: any, report: DailyBuslistReportModel[]): Array<any>
    {
        const data: Array<any> = [];
        const headers: Array<any> = [];
        _.map(field, (val)=>{
            headers.push(
                {text: val.name, style: 'boldTd' }
            )
        })
        data.push(headers);
        _.map(report, (reo) => {
            const rows: Array<any> = [];
            _.map(field, (fe) => {
                rows.push(
                    reo.getValue(fe['res']),
                )
            })
            data.push(rows);
        })
        return data;
    }


    downLoadPdf(heading: any, start, end):void{
        setTimeout(() => {
            const date = 'Date:' + end + ' to ' + start ;
            const content = this.getPrintViewContent(this.field, this.busAttendanceReport);
            this._pdfService
            .print('download',this.field, content, heading, date);
        }, 500);
    }

    downLoadPdfBusList(heading: any, start, end, room, bus):void{
        // return null;
        setTimeout(() => {

            let listDate = [];
            listDate = ['monday','tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            const content = [];
            content.push({ text: this._authService.getClient().organization + ' @ ' + this._authService.getClient().name , style: 'mainHeader' });
            content.push({ text: room + ' - ' + bus + ', from Monday, ' + DateTimeHelper.parseMoment(start).format('D MMMM YYYY') , style: 'mainHeader2' });

            let row  = [];
            const weekDaysTotalBus = [];
            for(const x in listDate)
            {
                weekDaysTotalBus[listDate[x]] = 0;

            }
            for (const school in this.busListReportRawData) {
                // FOR A SINGLE SCHOOL:
                let schoolTable: any;
                let schoolTitle: any;
                schoolTable = [];

                for(const child in this.busListReportRawData[school])
                {

                    // start an array for row, this is where the childs name is pushed in. next for loop is rest of the columns!
                    let childname;
                    let bookingarray;
                    bookingarray = [];
                    let days;
                    for(const booking in this.busListReportRawData[school][child])
                    {
                        childname = this.busListReportRawData[school][child][booking].child.first_name+ ' ' + this.busListReportRawData[school][child][booking].child.last_name;
                        const date = this.busListReportRawData[school][child][booking].date;
                        const day = this.busListReportRawData[school][child][booking].day;
                        const feename = this.busListReportRawData[school][child][booking].fee_name;
                        const phone = this.busListReportRawData[school][child][booking].phone;
                        const phone2 = this.busListReportRawData[school][child][booking].phone2;
                        const workPhone = this.busListReportRawData[school][child][booking].work_phone;
                        const bookingType = (this.busListReportRawData[school][child][booking].fee_type === '0') ? 'PB' : 'CB';
                        schoolTitle = this.busListReportRawData[school][child][booking].school_name;
                        // push the each record of the child into an array

                        bookingarray.push(
                            { 'child_id' : this.busListReportRawData[school][child][booking].child_id,
                              'childName' : childname,
                              'date': date,
                              'day': day,
                              'feename': feename,
                              'booking_type': bookingType,
                              'phone': phone,
                              'phone2': phone2,
                              'work_phone': workPhone
                            }
                        )

                    }
                    days = {};

                    for(const listDay in listDate)
                    {
                        // go through the days of the week,
                        // if a record exists in a given day, push it to an array. also push the childname and phone number column values.

                        days[listDate[listDay]] = bookingarray.filter(i => i.day === listDate[listDay]) ? bookingarray.filter(i => i.day === listDate[listDay])[0] : '';
                        if(days[listDate[listDay]])
                        {
                            days['childName'] = days[listDate[listDay]].childName;
                            days['mobile'] = days[listDate[listDay]].phone;
                            days['homePhone'] = days[listDate[listDay]].phone2;
                            days['workPhone'] = days[listDate[listDay]].work_phone;
                        }
                        if(days[listDate[listDay]])
                            days[listDate[listDay]] =  days[listDate[listDay]].booking_type;
                        else
                            days[listDate[listDay]] = ' ';

                    }
                    // push a single row of a table
                    row.push(days);
                }
                // school ends. new table needed.
                // also, append the school total row here.
                const weekDays = [];
                // initialize school total array, setting each days value to 0.
                for(const x in listDate)
                {
                    weekDays[listDate[x]] = 0;

                }
                for(const rowElement in row)
                {
                    // for each row of the records
                    // go through the days of the week,
                    // if a record exists, increase counter.
                    // 'row' array is the main content row for the pdf table.
                    for(const listDay in listDate)
                    {
                        if(row[rowElement][listDate[listDay]] !== ' ')
                        {
                            weekDays[listDate[listDay]] = weekDays[listDate[listDay]] + 1; // increase school total
                            weekDaysTotalBus[listDate[listDay]] = weekDaysTotalBus[listDate[listDay]] + 1; // increase bus total


                        }
                    }
                }
                // set school Total column name
                weekDays['mobile'] = 'School Total';
                row.push(weekDays);


                // check if we are going through the last school
                if(school===(Object.keys(this.busListReportRawData).length-1).toString())
                {



                    // set bus total column name
                    weekDaysTotalBus['mobile'] = 'Bus Total';
                    // add an empty row
                    row.push({
                        'childName': ' ',
                        'phoneNumber': ' ',
                        'monday': ' ',
                        'tuesday': ' ',
                        'wednesday': ' ',
                        'thursday': ' ',
                        'friday': ' ',
                        'saturday': ' ',
                        'sunday': ' ',
                    });
                    // add the bus total row
                    row.push(weekDaysTotalBus);
                }

                // create an array with dates of the weeks in Y-m-d format
                const dates = [];
                const startDate = start;
                const endDate = end;
                const dateMove = new Date(startDate);
                let strDate = startDate;

                while (strDate < endDate){
                    strDate = dateMove.toISOString().slice(0,10);
                    dates.push(strDate);
                    dateMove.setDate(dateMove.getDate()+1);
                };
                // push the dates of the weeks as the top of the table
                row.unshift({
                    'childName': ' ',
                    'phoneNumber': ' ',
                    'monday': { text :DateTimeHelper.parseMoment(dates[0]).format('D/M/YYYY'), style: 'boldTd'},
                    'tuesday': { text :DateTimeHelper.parseMoment(dates[1]).format('D/M/YYYY'), style: 'boldTd'},
                    'wednesday': { text :DateTimeHelper.parseMoment(dates[2]).format('D/M/YYYY'), style: 'boldTd'},
                    'thursday': { text :DateTimeHelper.parseMoment(dates[3]).format('D/M/YYYY'), style: 'boldTd'},
                    'friday': { text :DateTimeHelper.parseMoment(dates[4]).format('D/M/YYYY'), style: 'boldTd'},
                    'saturday': { text :DateTimeHelper.parseMoment(dates[5]).format('D/M/YYYY'), style: 'boldTd'},
                    'sunday': { text :DateTimeHelper.parseMoment(dates[6]).format('D/M/YYYY'), style: 'boldTd'},
                });
                // map the table rows to the BusListReport Model,

                this.report = row.map((i: any, idx: number) => new BuslistReportModel(i, idx));

                // get the formatted table rows
                schoolTable = this.getPrintViewContentBusList(this.buslistField, this.report);
                // school is finished so set the rows to null again.
                row = [];
                // push School name as title before the table
                content.push({ text: schoolTitle, style: 'header' });
                schoolTitle = '';
                // push table to the content array
                content.push({

                    table: {
                        headerRows: 1,
                        keepWithHeaderRows: true,
                        dontBreakRows: false,
                        widths: [85, 60, 60, 60, 45, 45, 45, 45, 45],
                        body: schoolTable
                    },
                    layout: {
                        defaultBorders: false,
                        paddingLeft: (i, node) => 4,
                        paddingRight: (i, node) => 4,
                        paddingTop: (i, node) => 4,
                        paddingBottom: (i, node) => 4,
                        hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                        vLineWidth: (i, node)  => 1,
                        hLineColor: (i, node)  => (i === 0 || i === 2 || i === node.table.body.length-1) ? null : (i === node.table.body.length-3 && school===Object.keys(this.busListReportRawData).length.toString())? null : '#f4f4f4',
                        vLineColor: (i, node)  => '#f4f4f4',
                        bold: (i, node) => (i === node.table.body.length - 1 || i === 2),
                    },
                    style: 'table'
                });
                // break after a table
                content.push({ text: ' ', style: 'header' });

            }
            // styles for the pdf table
            const styles = {
                header: {
                    fontSize: 9,
                    margin: [0 , 0, 0, 8],
                    bold: true
                },
                mainHeader: {
                    fontSize: 12,
                    alignment: 'center',
                    bold: true
                },
                mainHeader2: {
                    fontSize: 12,
                    alignment: 'center',
                    italics: true,
                    bold: true
                },
                date: {
                    fontSize: 8,
                    margin: [0 ,8 , 0, 0],
                    color: '#969696'
                },
                table: {
                    fontSize: 8,
                    margin: [0, 10, 0, 0]
                },
                logo: {
                    alignment: 'right',
                    margin: [0, -35, 0, 0]
                },
                boldTd: {
                    bold: true
                }
            }

            this._pdfHelperService
                .generatePDF('open', false, 'A4', 'Bus List Report', content, styles, _.snakeCase(_.toLower('Bus List Report')))
                .catch(error => { throw error; });

        }, 500);
    }


    downLoadPdfBusListDaily(heading: any, start, end, room, bus):void{
        // return null;
        setTimeout(() => {

            let listDate = [];
            listDate = [DateTimeHelper.parseMoment(start).format('dddd')];
            const content = [];
            content.push({ text: this._authService.getClient().organization + ' @ ' + this._authService.getClient().name , style: 'mainHeader' });
            content.push({ text: room + ' - ' + bus + ', on, ' + DateTimeHelper.parseMoment(start).format('D MMMM YYYY') , style: 'mainHeader2' });

            let row  = [];
            const weekDaysTotalBus = [];
            weekDaysTotalBus['booking'] = 0;
            for (const school in this.busListReportRawData) {
                // FOR A SINGLE SCHOOL:
                let schoolTable: any;
                let schoolTitle: any;
                schoolTable = [];

                for(const child in this.busListReportRawData[school])
                {

                    // start an array for row, this is where the childs name is pushed in. next for loop is rest of the columns!
                    let childname;
                    let bookingarray;
                    bookingarray = [];
                    let days;
                    for(const booking in this.busListReportRawData[school][child])
                    {
                        childname = this.busListReportRawData[school][child][booking].child.first_name+ ' ' + this.busListReportRawData[school][child][booking].child.last_name;
                        const date = this.busListReportRawData[school][child][booking].date;
                        const day = this.busListReportRawData[school][child][booking].day;
                        const feename = this.busListReportRawData[school][child][booking].fee_name;
                        const phone = this.busListReportRawData[school][child][booking].phone;
                        const phone2 = this.busListReportRawData[school][child][booking].phone2;
                        const workPhone = this.busListReportRawData[school][child][booking].work_phone;
                        const bookingType = (this.busListReportRawData[school][child][booking].fee_type === '0') ? 'PB' : 'CB';
                        schoolTitle = this.busListReportRawData[school][child][booking].school_name;
                        // push the each record of the child into an array

                        bookingarray.push(
                            { 'child_id' : this.busListReportRawData[school][child][booking].child_id,
                                'childName' : childname,
                                'date': date,
                                'day': day.charAt(0).toUpperCase() + day.slice(1),
                                'feename': feename,
                                'booking_type': bookingType,
                                'phone': phone,
                                'phone2': phone2,
                                'work_phone': workPhone
                            }
                        )
                    // console.log(bookingarray);
                    }
                    days = {};

                    for(const listDay in listDate)
                    {
                        // go through the days of the week,
                        // if a record exists in a given day, push it to an array. also push the childname and phone number column values.

                        days[listDate[listDay]] = bookingarray.filter(i => i.day === listDate[listDay]) ? bookingarray.filter(i => i.day === listDate[listDay])[0] : '';
                        if(days[listDate[listDay]])
                        {
                            days['childName'] = days[listDate[listDay]].childName;
                            days['mobile'] = days[listDate[listDay]].phone;
                            days['homePhone'] = days[listDate[listDay]].phone2;
                            days['workPhone'] = days[listDate[listDay]].work_phone;
                        }
                        if(days[listDate[listDay]])
                            days['booking'] =  days[listDate[listDay]].booking_type;
                        else
                            days['booking'] = ' ';
                    }
                    // push a single row of a table
                    row.push(days);
                }
                // school ends. new table needed.
                // also, append the school total row here.
                const weekDays = [];
                // initialize school total set value to 0.
                weekDays['booking'] = 0;
                for(const rowElement in row)
                {
                    // for each row of the records
                    // go through the days of the week,
                    // if a record exists, increase counter.
                    // 'row' array is the main content row for the pdf table.
                    for(const listDay in listDate)
                    {
                        if(row[rowElement]['booking'] !== ' ')
                        {
                            weekDays['booking'] = weekDays['booking'] + 1; // increase school total
                            weekDaysTotalBus['booking'] = weekDaysTotalBus['booking'] + 1; // increase bus total


                        }
                    }
                }
                // set school Total column name
                weekDays['mobile'] = 'School Total';
                row.push(weekDays);



                // check if we are going through the last school
                if(school===(Object.keys(this.busListReportRawData).length-1).toString())
                {

                    // set bus total column name
                    weekDaysTotalBus['mobile'] = 'Bus Total';
                    // add an empty row
                    row.push({
                        'childName': ' ',
                        'phoneNumber': ' ',
                        'booking': ' ',
                    });
                    // add the bus total row
                    row.push(weekDaysTotalBus);
                }

                // create an array with dates of the weeks in Y-m-d format
                const dates = [];
                const startDate = start;
                const endDate = end;
                const dateMove = new Date(startDate);
                let strDate = startDate;

                while (strDate < endDate){
                    strDate = dateMove.toISOString().slice(0,10);
                    dates.push(strDate);
                    dateMove.setDate(dateMove.getDate()+1);
                };
                // push the dates of the weeks as the top of the table
                row.unshift({
                    'childName': ' ',
                    'phoneNumber': ' ',
                    'homePhone': ' ',
                    'workPhone': ' ',
                    'booking': { text :DateTimeHelper.parseMoment(start).format('D/M/YYYY'), style: 'boldTd'},
                });
                // map the table rows to the BusListReport Model,
                this.dailyReport = row.map((i: any, idx: number) => new DailyBuslistReportModel(i, idx));
                // get the formatted table rows
                schoolTable = this.getPrintViewContentBusListDaily(this.dailyBuslistField, this.dailyReport);
                // school is finished so set the rows to null again.
                row = [];
                // push School name as title before the table
                content.push({ text: schoolTitle, style: 'header' });
                schoolTitle = '';
                // push table to the content array
                content.push({

                    table: {
                        headerRows: 1,
                        keepWithHeaderRows: true,
                        dontBreakRows: false,
                        widths: [225, 60, 60, 60, 85],
                        body: schoolTable
                    },
                    layout: {
                        defaultBorders: false,
                        paddingLeft: (i, node) => 4,
                        paddingRight: (i, node) => 4,
                        paddingTop: (i, node) => 4,
                        paddingBottom: (i, node) => 4,
                        hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                        vLineWidth: (i, node)  => 1,
                        hLineColor: (i, node)  => (i === 0 || i === 2 || i === node.table.body.length-1) ? null : (i === node.table.body.length-3 && school===Object.keys(this.busListReportRawData).length.toString())? null : '#f4f4f4',
                        vLineColor: (i, node)  => '#f4f4f4',
                        bold: (i, node) => (i === node.table.body.length - 1 || i === 2),
                    },
                    style: 'table'
                });
                // break after a table
                content.push({ text: ' ', style: 'header' });

            }
            // styles for the pdf table
            const styles = {
                header: {
                    fontSize: 9,
                    margin: [0 , 0, 0, 8],
                    bold: true
                },
                mainHeader: {
                    fontSize: 12,
                    alignment: 'center',
                    bold: true
                },
                mainHeader2: {
                    fontSize: 12,
                    alignment: 'center',
                    italics: true,
                    bold: true
                },
                date: {
                    fontSize: 8,
                    margin: [0 ,8 , 0, 0],
                    color: '#969696'
                },
                table: {
                    fontSize: 8,
                    margin: [0, 10, 0, 0]
                },
                logo: {
                    alignment: 'right',
                    margin: [0, -35, 0, 0]
                },
                boldTd: {
                    bold: true
                }
            }

            this._pdfHelperService
                .generatePDF('download', false, 'A4', 'Bus List Report (Daily)', content, styles, _.snakeCase(_.toLower('Daily Bus List Report')))
                .catch(error => { throw error; });

        }, 500);
    }

    downLoadCsv(heading: any, field):void{

        const masterRows = [];

            _.map(this.busAttendanceReport, (reo) => {
                const rows = {};
                _.map(field, (fe) => {
                        rows[fe['name']] = reo.getValue(fe['res']);
                })
                masterRows.push(rows);
            })

            if(masterRows.length > 0) {
                const csvData = this.objectToCsv(masterRows);
                this._csvService
                .downLoadCsvFile(csvData, heading);
            }

            else {
                setTimeout(() => this._notification.displaySnackBar('No data found', NotifyType.INFO), 200);
                return;
            }
        

    }

     objectToCsv(data): any {
        const csvRows = [];
        const headers = Object.keys(data[0])
        csvRows.push(headers.join(','))
        for(const row of data) {
           const value = headers.map(header =>{
            return row[header];
            });

            csvRows.push(value.join(','));
            
        }
        return csvRows.join('\n');

        
    }



        /**
     * Unsubscribe options
     */
    unsubscribeOptions(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        this.onReportChanged.next([]);

        // reset all variables
        this.pagination = null;
        this.filterBy = null;
        this.sortBy = null;
        this.field = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
        this.field  = null;
        this.busAttendanceReport = null
    }

    clearLastRememberOptions(): void
    {
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

}

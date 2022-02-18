import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { User } from 'app/main/modules/user/user.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { ChildrenService } from '../../child/services/children.service';
import { ContactReport } from '../contact-reports/model/contact-report.model';
import { RoomService } from '../../room/services/room.service';
import * as jsPDF from 'jspdf'
import 'jspdf-autotable'
import { JsPDFService } from 'app/shared/service/pdf.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { SortProp } from 'app/shared/interface/sort';
import { CsvService } from 'app/shared/service/csv.service';
import { ReportDependencyervice } from './report-dependencey.service';
import { ReportModel } from '../model/report.model';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';
import { Child } from '../../child/child.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Room } from '../../room/models/room.model';



@Injectable()
export class ContactReportservice implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;
    report: any[];
    parentChildReport: [];
    reportType: string;
    onReportChanged: BehaviorSubject<any>;
    onUserChanged: BehaviorSubject<any>;
    onChildChanged: BehaviorSubject<any>;
    onPaginationChanged: Subject<PaginationProp>;
    onFieldChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    filterByProps: string;
    rooms: Room[];
    selectedRooms: [];

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
    reportHeading: string;

    childId: any;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param _childrenService
     * @param _roomService
     * @param _pdfService
     * @param _csvService
     * @param _notification
     * @param _reportDependencyervice
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _roomService: RoomService,
        private _pdfService: JsPDFService,
        private _csvService: CsvService,
        private _notification: NotificationService,
        private _reportDependencyervice:ReportDependencyervice,
        private _pdfHelperService: PDFHelperService,
    ) {
        // Set the defaults
        this.report = [];
        this.reportType = '';
        this.parentChildReport = [];
        this.rooms = [];
        this.filterByProps = '';
        this._unsubscribeAll = new Subject();
        this.onFieldChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();

        this.onReportChanged = new BehaviorSubject([]);
        this.onUserChanged = new BehaviorSubject([]);
        this.onChildChanged = new BehaviorSubject([]);

        this.childId = null;
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

        return new Promise<void>((resolve, reject) => {
            const obje = {
                type: 'CON'
            };
            Promise.all([
                this._reportDependencyervice.getChildren(),
                this._reportDependencyervice.getAllRooms(true),
                this._reportDependencyervice.getRepotsData(obje)
            ])
                .then(([roles, room, report]: [any, Room[], ReportModel[]]) => {
                    
                    this.getAllRooms(true);
                    // this.setEvents();
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    setEvents(): void
    {

        // this.onFieldChanged
        //     .pipe(takeUntil(this._unsubscribeAll))
        //     .subscribe(field =>
        //     {
        //         this.field = field;

        //     });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination))
                {
                    this.pagination.page = this.defaultPageIndex;
                }

            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination =>
            {
                this.pagination = pagination;
                
            });
    }

    viewReports(data: object, getSelectedField: any): Observable<any>
    {
        this.onTableLoaderChanged.next(true);
        this.reportType = data['type'];
        this.filterByProps = data['filterBy'];
        
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-contact-report`, data)
            .pipe(
                map(response => 
                {
                    if (response.data)
                    {

                            this.report = response.data['list'],//response.data.map((i: any, idx: number) => new parentChildReport(i, idx));
                            this.totalRecords = response.data['actual_count'];
                            this.field = getSelectedField;
                           
                        // this.onFieldChanged.next(getSelectedField);
                        if(this.reportType === 'CCR') {
                            for (const item in this.report) {
                                this.report[item].middleName = (this.report[item].middleName) ? this.report[item].middleName: '';
                                this.report[item].callOrder = (this.report[item].call_order) ? this.report[item].call_order: '';

                                // handle the commas in emergency type to display as csv
                                if(this.report[item]['type'])
                                {
                                    this.report[item]['type'] = this.report[item]['type'].toString().replace(/,/g, ' / ');
                                }
                            }
                        }
                        if(this.reportType === 'CON_CECR')
                        {
                            for (const item in this.report) {
                                // handle the commas in emergency type to display as csv
                                if (this.report[item]['type']) {
                                    this.report[item]['type'] = this.report[item]['type'].toString().replace(/,/g, ' / ');
                                }
                            }
                        }
                    }

                    const rooms = [];

                    if(data['filterBy'] === 'ROOM'){

                        
                        for(const id of data['room']){

                            console.log(id);
                            
                            rooms.push(this.rooms.find(v=> v.id === id).title)
                         }

                    }
                    
                    setTimeout(() => this.onReportChanged.next({
                        records: this.report,
                        total: this.totalRecords,
                        selectedField: getSelectedField,
                        reportType: data['type'],
                        include_type: data['include_type'],
                        room: rooms
                    }), 500);
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    viewPrimaryPayerReports(data: object, view: boolean, pdf: boolean): Observable<any>
    {
        this.onTableLoaderChanged.next(true);
        this.reportType = data['type'];
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-contact-primary-payer-report`, data)
            .pipe(
                map(response => 
                {
                    if (response.data)
                    {
                        this.report = response.data;
                        this.totalRecords = response.data['totalRecords'];

                        if (view) {
                            // View data
    
                            setTimeout(() => this.onReportChanged.next({
                                records: this.report,
                                total: this.report.length,
                                selectedField: [],
                                reportType: data['type'],
                            }), 500);
    
                        } else {
                            
                            if (pdf) {
                                // PDF
                                this.primaryPayerPdf(response.data || [], data['sdate'], data['edate']);
                            } else {
                                // Csv
                                this.primaryPayerCsv(response.data || [], data['sdate'], data['edate']);
                            }
    
                        }

                        
                    }
                    
                    
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    getDataForReport(data: object, getSelectedField: any, isPdf: boolean, report: ReportModel): Observable<any>
    {
        this.reportType = data['type'];
        this.filterByProps = data['filterBy'];
        data['is_csv'] = isPdf? false : true;
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-contact-report`, data)
            .pipe(
                map(response => 
                {
                    let roomNames = '';
                    if (response.data)
                    {
                            this.report = response.data['list'],//response.data.map((i: any, idx: number) => new parentChildReport(i, idx));
                            this.totalRecords = response.data['actual_count'];
                            this.field = getSelectedField;
                    }
                    if(this.reportType === 'CCR')
                    {
                        for(const item in this.report)
                        {
                            if(this.report[item]['id'] === this.childId)
                            {
                                this.report[item]['firstName'] = ' ';
                                this.report[item]['middleName'] = ' ';
                                this.report[item]['lastName'] = ' ';
                            }
                            let middleName = (this.report[item].middleName) ? this.report[item].middleName: '';

                            this.report[item]['firstName'] = this.report[item]['firstName'] + ' ' + middleName + ' ' + this.report[item]['lastName'];
                            this.report[item]['eFirstName'] = this.report[item]['eFirstName'] + ' ' + this.report[item]['eLastName'];

                            this.childId = this.report[item]['id'];

                            // handle the commas in emergency type to display as csv
                            if(this.report[item]['type'])
                            {
                                this.report[item]['type'] = this.report[item]['type'].toString().replace(/,/g, ' / ');
                            }
                        }
                        this.field = [
                            {
                                'name': 'Child Name',
                                'res': 'firstName'
                            },
                            {
                                'name': 'Relation',
                                'res': 'relationshipE'
                            },
                            {
                                'name': 'Contact',
                                'res': 'eFirstName'
                            },
                            {
                                'name': 'Home',
                                'res': 'phoneNumberE'
                            },
                            {
                                'name': 'Mobile',
                                'res': 'MobileNumberE'
                            },
                            {
                                'name': 'Work',
                                'res': 'workPhoneNumberE'
                            },
                            {
                                'name': 'Email',
                                'res': 'emailE'
                            },
                            {
                                'name': 'Priority',
                                'res': 'call_order'
                            }
                        ];

                        if(data['include_type']){
                            this.field.push({
                                'name': 'Types',
                                'res': 'type'
                            })
                        }

                    const rooms = [];

                    if(data['filterBy'] === 'ROOM'){

                        for(const id of data['room']){

                            console.log(id);
                            
                            rooms.push(this.rooms.find(v=> v.id === id).title)
                         }

                         roomNames = rooms.join(', ');

                    }
                        
                    }

                    if(this.reportType === 'CON_CECR')
                    {
                        this.field.push(
                            {
                                'name': 'Priority',
                                'res': 'call_order'
                            }
                        )

                        for(const item in this.report)
                        {
                            // handle the commas in emergency type to display as csv
                            if(this.report[item]['type'])
                            {
                                this.report[item]['type'] = this.report[item]['type'].toString().replace(/,/g, ' / ');
                            }
                        }
                    }
                    console.log(this.report);
                    setTimeout(() => {
                        isPdf ? this.downLoadPdf(report.name, data['sdate'], data['edate'], roomNames) : this.downLoadCsv(report.name, this.field);
                    }, 500);
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    getPrintViewContent(field: any, report:ContactReport[]): Array<any>
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
                rows.push(reo[fe['res']] ? reo[fe['res']]  : 'N/A' );
            })
            data.push(rows);
        })
        return data;
    }


    downLoadPdf(heading: any, end_date, start_date, roomNames):void{

  
        let dateRange = '';
        
        if (start_date && end_date) {
            dateRange = `Date ${start_date ? DateTimeHelper.parseMoment(start_date).format('DD-MM-YYYY') : ''} to ${end_date ? DateTimeHelper.parseMoment(end_date).format('DD-MM-YYYY') : ''}`;
        }
        if (start_date && !end_date) {

            dateRange = `Date from ${start_date ? DateTimeHelper.parseMoment(start_date).format('DD-MM-YYYY') : ''}`;
        }
        if (!start_date && end_date) {

            dateRange = `Date to: ${end_date ? DateTimeHelper.parseMoment(end_date).format('DD-MM-YYYY') : ''}`;
        }
        
        setTimeout(() => {

            const table = this.getPrintViewContent(this.field, this.report);
            let roomName = '';

            if (this.reportType === 'CCR' && this.filterByProps === 'ROOM') {

                roomName =  `Room [${roomNames}]`;
            }

            const pageTitle = 'Child Contact Report';
            const pageType = 'A4';
            const isLandscape =  false;
            const content = [
                { text: pageTitle, style: 'header' },
                { text: roomName, style: 'room' },
                { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
                { text: dateRange, style: 'date' },
                {
                    table: {
                        headerRows: 1,
                        keepWithHeaderRows: true,
                        dontBreakRows: true,
                        widths: _.fill(new Array(this.field.length), 'auto'),
                        body: table
                    },
                    layout: {
                        defaultBorders: false,
                        paddingLeft: (i, node) => 4,
                        paddingRight: (i, node) => 4,
                        paddingTop: (i, node) => 4,
                        paddingBottom: (i, node) => 4,
                        hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                        vLineWidth: (i, node)  => 0,
                        hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                        vLineColor: (i, node)  => null
                    },
                    style: 'table'
                }
            ];
    
            const styles = {
                header: {
                    fontSize: 21,
                    margin: [0 , 0, 0, 8],
                },
                room:{
                    fontSize: 10,
                    margin: [0 , 0, 0, 8],
                },
                date: {
                    fontSize: 12,
                    margin: [0 ,8 , 0, 0],
                    color: '#969696'
                },
                table: {
                    fontSize: 10,
                    // margin: [0, 10, 0, 0],
                    margin: [0, 5, 0, 15]
                },
                logo: {
                    alignment: 'right',
                    margin: [0, -35, 0, 0]
                },
                subheader: {
                    fontSize: 14,
                    bold: false,
                    margin: [0, 10, 0, 5]
                },
            };
    
    
            this._pdfHelperService
                .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
                .catch(error => { throw error; });
        }, 500);
    }

    downLoadCsv(heading: any, field):void{

        const masterRows = [];
        
            _.map(this.report, (reo) => {
                const rows = {};
                _.map(field, (fe) => {
                        rows[fe['name']] = reo[fe['res']] ? reo[fe['res']]  : 'N/A';
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
        const headers = Object.keys(data[0]);
        // console.log('headers', headers[0].replace(/’/g, "'"));
        csvRows.push(headers.join(',').replace(/’/g, "'"))
        
        
        for(const row of data) {
           const value = headers.map(header =>{
            // return row[header]
               const escaped = row[header].replace(/'/g, "");
            //    console.log('escaped', escaped);
               
                return `"${escaped}"`
            });

            csvRows.push(value.join(','));
            
        }
        return csvRows.join('\n');

        
    }

    getCurrentDate():any {
        const currentdate = new Date();
        return  currentdate.getDate() + '/' + (currentdate.getMonth() + 1) + '/' + currentdate.getFullYear();
    }

    primaryPayerPdf(reportData: Child[],end_date, start_date ): void {

        const child = reportData.map((i, idx) => new Child(i, idx));

        const data: Array<any> = [];

        const headings = ['Child Full Name', 'Primary Payer Name ', 'Date assigned'];


        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        data.push(headers);

        _.forEach(child, (record) => {

            let arr = [];

                arr = [
                    record.getFullName(),
                    this.getPrimaryPayer(record),
                    this.getPrimaryPayerDate(record),
                ];
                
            data.push(arr);

        });

        let dateRange = '';
        if(start_date && end_date){
             dateRange = `Date: ${start_date?DateTimeHelper.parseMoment(start_date).format('DD-MM-YYYY'):''} to ${end_date?DateTimeHelper.parseMoment(end_date).format('DD-MM-YYYY'): ''}`;
        }
        if(start_date && !end_date){

            dateRange = `Date from: ${start_date?DateTimeHelper.parseMoment(start_date).format('DD-MM-YYYY'):''}`;
        }
        if(!start_date && end_date){

            dateRange = `Date: ${end_date?DateTimeHelper.parseMoment(end_date).format('DD-MM-YYYY'):''}`;
        }

        const pageTitle = 'Primary Payer Report';
        const pageType = 'A4';
        const isLandscape =  false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: dateRange, style: 'date' },
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: ['35%', '35%', '30%'],
                    body: data
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            }
        ];

        const styles = {
            header: {
                fontSize: 21,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 10,
                // margin: [0, 10, 0, 0],
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 14,
                bold: false,
                margin: [0, 10, 0, 5]
            },
        };


        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });


    }

    primaryPayerCsv(reportData: Child[], end_date, start_date,): void {

        const child = reportData.map((i, idx)=> new Child(i, idx));

        const headings = ['Child Full Name', 'Primary Payer Name ', 'Date assigned'];
        
        let dateRange = '';

        if (start_date && end_date) {
            dateRange = `Primary Payer Report as of ${start_date ? DateTimeHelper.parseMoment(start_date).format('DD-MM-YYYY') : ''} to ${end_date ? DateTimeHelper.parseMoment(end_date).format('DD-MM-YYYY') : ''}`;
        }
        if (start_date && !end_date) {

            dateRange = `Primary Payer Report from ${start_date ? DateTimeHelper.parseMoment(start_date).format('DD-MM-YYYY') : ''}`;
        }
        if (!start_date && end_date) {

            dateRange = `Primary Payer Report to: ${end_date ? DateTimeHelper.parseMoment(end_date).format('DD-MM-YYYY') : ''}`;
        }

        const masterRows = [
            [dateRange],
            headings,
            ...child.map((record: any) => {

                const arr = [
                    record.getFullName(),
                    this.getPrimaryPayer(record),
                    this.getPrimaryPayerDate(record),
                ];
                return arr;

            })
        ];

        const csvData = this.makeCsvData(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Primary Payer Report');

    }

    makeCsvData(data: any[]): string {
        return data.map((e: any) => {
            return e.map((val: any) => {
                if (val) {
                    return val.toString().replace(/[",]/g, '');
                } else {
                    return val;
                }
            }).join(',');
        }).join('\n');
    }

    getPrimaryPayer(child: Child){

        return child.parents.filter(v=> v.isPrimaryPayer === true).length > 0 ? (child.parents.find(v=> v.isPrimaryPayer === true).getFullName()) : 'N/A';
      }

    getPrimaryPayerDate(child: Child){

        if (child.parents.filter(v=> v.isPrimaryPayer === true && v.pivotUpdatedAt !== null).length > 0){
    
            return DateTimeHelper.parseMoment(child.parents.find(v=> v.isPrimaryPayer === true).pivotUpdatedAt).format('DD-MM-YYYY');
        }
        else{
            return 'N/A';
        }
    }

    getAllRooms(getadminonlyrooms : boolean = false): Promise<any>
    {
        const params = new HttpParams().set('getadminonlyrooms', (getadminonlyrooms)? 'true': 'false' );
        return new Promise((resolve, reject) =>
        {
            this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-rooms-report`,{params})
            .pipe(
                map(response =>
                    {
                        this.rooms = response.data.map((i: any, idx: number) => new Room(i, idx));

                    }),
                    shareReplay()
            )
            .subscribe(
                (response: any) =>
                {
                    resolve();
                },
                reject
            );
        });
        
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
        this.report = []
    }

    clearLastRememberOptions(): void
    {
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

}

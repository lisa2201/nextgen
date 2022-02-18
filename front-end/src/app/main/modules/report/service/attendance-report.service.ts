import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize, first } from 'rxjs/operators';

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
import { AttendanceReport } from '../attendance-reports/model/attendance-report.model';
import { Child } from '../../child/child.model';
import { ReportDependencyervice } from './report-dependencey.service';
import { ReportModel } from '../model/report.model';
import { Booking } from '../../child/booking/booking.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Room } from '../../room/models/room.model';
import { BookingMasterRollItem } from '../../booking-master-roll/calendar-week-view/calendar-week-view.component';
import { BookingCalendarItem } from '../../child/booking/calendar-view/calendar-view.component';
import * as uuid from 'uuid';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';
import { ConvertNumberToTimeStringPipe } from 'app/shared/pipes/convert-number-to-12-hours.pipe';
import { OrderByPipe } from 'ngx-pipes';
import {AuthService} from '../../../../shared/service/auth.service';
import * as moment from 'moment';
import {RoomCapacity} from '../../room/models/room-capacity';
import {UtilisationreportModel} from '../model/utilisationreport.model';


@Injectable()
export class AttendanceReportservice implements Resolve<any>
{
    private bookings: Booking[];
    rooms: Room[];
    private _unsubscribeAll: Subject<any>;
    report: AttendanceReport[];
    utilisationReport: UtilisationreportModel[];
    children: Child[];
    onReportChanged: BehaviorSubject<any>;
    onChildrenChanged: BehaviorSubject<any>;
    onChildChanged: BehaviorSubject<any>;
    onChildrenBookingDataChanged: BehaviorSubject<any>;
    onPaginationChanged: Subject<PaginationProp>;
    onFieldChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

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
    reportType:string = null;
    reportHeading: string;

    calenderSettings = {
        hideWeekEnd: true
    };

    hideWeekEnd: boolean = true;
    bookingCalendarTitle: any;
    bookingCalendar: BookingMasterRollItem[];
    showSessionTime: boolean;
    careProviderToggle: boolean;
    showInactive: boolean;
    roomName: string;
    utilisationField:any = [];

    calendarWeek: any;

    mapOfSort: Array<any> = [
        {
            name: 'Last Name A - Z',
            value: 'lastNameAsc',
            mapValue: {
                key: 'lastName',
                value: ''
            }
        },
    ];


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
     * @param _pdfHelperService
     * @param _timeConvert
     * @param _orderByPipe
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _authService: AuthService,
        private _roomService: RoomService,
        private _pdfService: JsPDFService,
        private _csvService: CsvService,
        private _notification: NotificationService,
        private _reportDependencyervice:ReportDependencyervice,
        private _pdfHelperService: PDFHelperService,
        private _timeConvert : ConvertNumberToTimeStringPipe,
        private _orderByPipe: OrderByPipe,
    ) {
        // Set the defaults
        this.report = [];
        this.bookingCalendar = [];
        this._unsubscribeAll = new Subject();
        this.onFieldChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();

        this.onReportChanged = new BehaviorSubject([]);
        this.onChildrenChanged = new BehaviorSubject([]);
        this.onChildChanged = new BehaviorSubject([]);
        this.onChildrenBookingDataChanged = new BehaviorSubject([]);
        this.showSessionTime = false;
        this.showInactive =  false;
        this.utilisationField = [
            {name: 'Room Name', res: 'roomName'},
            {name: ' ', res: 'fullSessions'},
            {name: 'Monday', res: 'Monday'},
            {name: 'Tuesday', res: 'Tuesday'},
            {name: 'Wednesday', res: 'Wednesday'},
            {name: 'Thursday', res: 'Thursday'},
            {name: 'Friday', res: 'Friday'},
            {name: 'Total Full Sessions', res: 'totalFullSessions'},
            {name: 'Total Positions', res: 'totalPositions'},
            {name: 'Weekly Occupancy (%)', res: 'weeklyOccupancy'},
            /*{name: 'Saturday', res: 'saturday'},
            {name: 'Sunday', res: 'sunday'}*/
        ]

        this.careProviderToggle = false;
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
                type: 'ATT'
            };
            Promise.all([
               this._reportDependencyervice.getChildren(),
                this._reportDependencyervice.getAllRooms(),
                this._reportDependencyervice.getRepotsData(obje),
            ])
                .then(([child, room, report]: [any, Room[], any]) => {

                    // this.children = [...this._orderByPipe.transform(
                    //     child, 
                    //     this.mapOfSort.find(i => i.value === 'lastNameAsc').mapValue.value + this.mapOfSort.find(i => i.value === 'lastNameAsc').mapValue.key
                    // )];
                    this.getChildren();
                    this.getAllRooms();

                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }


    viewReports(data: object,getSelectedField: any ): Observable<any>
    {
        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-attendance-report`,data)
            .pipe(
                map(response => 
                {
                    if (response.data && this.reportType !== 'WUS')
                    {

                        this.report = response.data.map((i: any, idx: number) => new AttendanceReport(i, idx, (response.allrooms || '')));

                        if(this.reportType === 'ATT_ASR')
                        {
                            this.report.sort((a, b) => {
                                if(b.child && a.child)
                                    return a.child.lastName.toUpperCase() < b.child.lastName.toUpperCase()? -1 : 1;
                            });

                            if(data['absence_toggle'] === false){

                                this.report = this.report.filter(v=> v.type == '0');
                            }
                        }

                        this.totalRecords = response.totalRecords;
                        this.field = getSelectedField;
                    }
                    else
                    {
                        this.downloadUtilisationReport(response.data);
                    }

                    setTimeout(() => this.onReportChanged.next({
                        records: this.report,
                        total: (this.report) ? this.report.length : 0,
                        selectedField: this.field,
                        type: this.reportType
                    }), 500);
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }


    downloadUtilisationReport(data: object): void
    {
        // return null;
        setTimeout(() => {

            let listDate = [];
            listDate = ['monday','tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            const content = [];
            content.push({ text: 'Utilisation Summary for ' + this._authService.getClient().organization + ' @ ' + this._authService.getClient().name , style: 'mainHeader' });
            /*const weekDaysBookingCount = [];
            for(const x in listDate)
            {
                weekDaysBookingCount[listDate[x]] = 0;

            }*/
            // in a single week, (week table)
            for(const week in data)
            {
                let weekTable: any;
                weekTable = [];
                let weekStart: any;
                let weekEnd: any;
                // console.log(week);

                const weeksFirstRoom = data[week][Object.keys(data[week])[0]];


                weekStart = DateTimeHelper.parseMoment(weeksFirstRoom[Object.keys(weeksFirstRoom)[0]].date).startOf('isoWeek').format('YYYY-MM-DD');
                weekEnd = DateTimeHelper.parseMoment(weeksFirstRoom[Object.keys(weeksFirstRoom)[0]].date).endOf('isoWeek').format('YYYY-MM-DD');
                // in a single room, (main room row)

                const weekStartDate = new Date(weekStart);
                const weekEndDate = new Date(weekEnd);


                let dateArray;
                dateArray = [];
                for(const dt=new Date(weekStartDate); dt<=weekEndDate; dt.setDate(dt.getDate()+1)){
                    // dateArray.push(new Date(dt));
                    dateArray.push(moment(dt).format('dddd'));
                }

                let weeklyTotalCount;
                const weekDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                weeklyTotalCount = [];
                for(const x  in weekDayNames)
                {
                    weeklyTotalCount[weekDayNames[x]] = 0;
                }

                let row;
                let totalPositions;
                totalPositions = 0;
                for(const room in data[week])
                {
                    const roomName = data[week][room][Object.keys(data[week][room])[0]].room.title;
                    // console.log(data[week][room][Object.keys(data[week][room])[0]].room.title);

                    let bookingarray;
                    bookingarray = [];
                    let days;
                    // booking in a room, go through weekdays and create a row

                    row = [];
                    for(const booking in data[week][room])
                    {
                        const date = data[week][room][booking].date;
                        const day = data[week][room][booking].day;

                        data[week][room][booking].room['capacity'] =  data[week][room][booking].room.room_capacity;
                        const roomObj = (data[week][room][booking].room && !_.isNull(data[week][room][booking].room)) ? new Room(data[week][room][booking].room) : [];;


                        bookingarray.push(
                            {
                                'date': date,
                                'day': day.charAt(0).toUpperCase() + day.slice(1),
                                'room': roomObj
                            }
                        )
                    }
                    days = {};
                    let count;
                    let occupancy;
                    count = {};
                    occupancy = {};
                    let roomTotalCount;
                    roomTotalCount = 0;
                    let roomCapacity;
                    roomCapacity = 0;
                    for(const weekDay in dateArray)
                    {
                        days[dateArray[weekDay]] = bookingarray.filter(i => i.day === dateArray[weekDay] && i.day !== 'saturday' && i.day !== 'sunday') ? bookingarray.filter(i => i.day === dateArray[weekDay]  && i.day !== 'saturday' && i.day !== 'sunday') : '';

                        count['roomName'] = roomName;
                        count['fullSessions'] = 'Full Sessions';
                        count[dateArray[weekDay]] =  days[dateArray[weekDay]].length;
                        // dont count the bookings on sunday and saturday
                        if(dateArray[weekDay] !== 'Saturday' && dateArray[weekDay] !== 'Sunday')
                            roomTotalCount = roomTotalCount + days[dateArray[weekDay]].length;
                        weeklyTotalCount[dateArray[weekDay]] = weeklyTotalCount[dateArray[weekDay]] + days[dateArray[weekDay]].length;
                        // console.log(weeklyTotalCount[dateArray[weekDay]]);
                        if(days[dateArray[weekDay]].length)
                        {
                            if(days[dateArray[weekDay]][0]['room'])
                                roomCapacity = days[dateArray[weekDay]][0]['room'].getRoomCapacity();
                        }
                        count['roomName'] = roomName + ' (capacity : ' + roomCapacity +')';
                    }

                    count['totalFullSessions'] = '';
                    count['totalPositions'] = '';
                    count['weeklyOccupancy'] = '';


                    for(const weekDay in dateArray)
                    {
                        occupancy['roomName'] = '';
                        occupancy['fullSessions'] = 'Occupancy (%)';
                        occupancy[dateArray[weekDay]] =  (days[dateArray[weekDay]].length)?  ((days[dateArray[weekDay]].length/days[dateArray[weekDay]][0]['room'].getRoomCapacity())*100).toFixed(2) + '%' : '0%';
                    }
                    occupancy['totalFullSessions'] = roomTotalCount;
                    occupancy['totalPositions'] = roomCapacity*5;
                    occupancy['weeklyOccupancy'] = (roomTotalCount/(roomCapacity*5)*100).toFixed(2)+'%';
                    totalPositions = totalPositions + occupancy['totalPositions'];

                    row.push(count);
                    row.push(occupancy);
                    // check if we are going through the last room of the week, if yes, add the total row.
                    // for that, get the last element of this weeks array (last room of this week)
                    let lastKey = null;
                    for(const keyX in data[week]){
                        if(data[week].hasOwnProperty(keyX)){
                            lastKey = keyX;
                        }
                    }
                    if(room === lastKey)
                    {
                        let tempTotalFullSessions;
                        tempTotalFullSessions = weeklyTotalCount['Monday'] + weeklyTotalCount['Tuesday'] + weeklyTotalCount['Wednesday'] + weeklyTotalCount['Thursday'] + weeklyTotalCount['Friday'];
                        row.push({
                            'roomName' : '',
                            'fullSessions': 'Total Full Sessions',
                            'Monday':  weeklyTotalCount['Monday'],
                            'Tuesday':  weeklyTotalCount['Tuesday'],
                            'Wednesday':  weeklyTotalCount['Wednesday'],
                            'Thursday':  weeklyTotalCount['Thursday'],
                            'Friday':  weeklyTotalCount['Friday'],
                            'totalFullSessions':  tempTotalFullSessions,
                            'totalPositions':  totalPositions,
                            'weeklyOccupancy':  (tempTotalFullSessions/totalPositions*100).toFixed(2)+'%',
                            });
                    }
                    weekTable.push(row);



                }

                // prepare all the rows and make a table weekly.
                let finalTable;
                finalTable = [];

                for(const r in weekTable)
                {
                    for(const ro in weekTable[r])
                    {
                        finalTable.push(weekTable[r][ro]);
                    }
                }
                this.utilisationReport = finalTable.map((i: any, idx: number) => new UtilisationreportModel(i, idx));
                row = [];
                content.push({ text: weekStart, style: 'header' });

                content.push({

                    table: {
                        headerRows: 1,
                        keepWithHeaderRows: true,
                        dontBreakRows: false,
                        widths: _.fill(new Array(this.utilisationField.length), 'auto'),
                        body: this.getPrintViewContentUtilisation(this.utilisationField, this.utilisationReport),
                    },
                    layout: {
                        defaultBorders: false,
                        paddingLeft: (i, node) => 4,
                        paddingRight: (i, node) => 4,
                        paddingTop: (i, node) => 4,
                        paddingBottom: (i, node) => 4,
                        hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                        vLineWidth: (i, node)  => 1,
                        hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length-1) ? null : (i === node.table.body.length-3 && week===Object.keys(data).length.toString())? null : '#f4f4f4',
                        vLineColor: (i, node)  => '#f4f4f4',
                        bold: (i, node) => (i === node.table.body.length - 1),
                    },
                    style: 'table'
                });


            }
            const styles = {
                header: {
                    fontSize: 10,
                    margin: [0 , 0, 0, 8],
                },
                mainHeader: {
                    fontSize: 12,
                    alignment: 'center',
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
                }
            }
            this._pdfHelperService
                .generatePDF('download', false, 'A4', 'Utilisation Report', content, styles, _.snakeCase(_.toLower('Utilisation Report')))
                .catch(error => { throw error; });

        }, 500);
    }

    getPrintViewContentUtilisation(field: any, report:UtilisationreportModel[]): Array<any>
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

    viewUtilisationReport(data: object, dateParams: any, isView: boolean, isPdf: boolean): Observable<any>
    {
        this.filterBy = {
            'child': data['child_sigle'],
            'room': data['room_sigle'],
            'showInactive' : data['status_toggle']
        };
        this.showSessionTime = data['session_time'];
        this.reportType = data['type'];
        this.calendarWeek = dateParams;
        this.showInactive = data['status_toggle'];
        this.careProviderToggle = data['care_provider_toggle'];

        if(isView){
            this.onTableLoaderChanged.next(true);
        }
        const params = new HttpParams()
            .set('start', data['week'].start)
            .set('end', data['week'].end)
            .set('filters', JSON.stringify(this.filterBy));
            
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-master-roll-list`, { params })
            .pipe(
                map(response => {
                    if (response.data) {
                        
                        this.bookings = response.data.map((i: any, idx: number) => new Booking(i, idx));
                        this.buildCalenderView();
                        this.bookingCalendarTitle = this.buildCalenderViewHeaders();
                        this.roomName = this.filterBy.room !== '0'? this.rooms.find(i => i.id === this.filterBy.room).title: 'All Rooms';
                        if (isView) {
                            setTimeout(() => this.onChildrenBookingDataChanged.next({
                                bookings: this.bookingCalendar,
                                header: this.bookingCalendarTitle,
                                type: this.reportType,
                                roomName: this.roomName,
                                session_time: this.showSessionTime 
                            }), 500);
                        }

                        else {

                            if (isPdf) {
                                setTimeout(() => {
                                    this.getUtilisationReportPdf();
                                    this.onTableLoaderChanged.next(false);
                                }, 500);

                            }
                            else {

                                setTimeout(() => {
                                    this.getUtilisationReportCSV();
                                    this.onTableLoaderChanged.next(false);
                                }, 500);
                            }
                        }


                    }
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    getPer(actual: number, scheduled: number, capacity: number, isActual: boolean): any{

        if(actual !== 0 || scheduled != 0) {
            return `${isActual? ((actual/(capacity))*100).toFixed(2) : ((scheduled/(capacity))*100).toFixed(2)}%`
        }
        else{
            return '-';
        } 
    }

    getTotal(isActual: boolean):any {

        let weekTotalBookings = 0;
        let weekTotalAttended = 0;
        if(isActual){

            for(const day of this.bookingCalendarTitle) {
                if(day.weekSummary){

                    weekTotalAttended += (day.weekSummary.attended);
                }
            }
            return weekTotalAttended;
        }
        else{

            for(const day of this.bookingCalendarTitle) {
                if(day.weekSummary){

                    weekTotalBookings += (day.weekSummary.bookings);
                }
            }
            return weekTotalBookings;

        }
    }

    getUtilisationReportCSV() {
        const start = DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek').format('YYYY-MM-DD');
        const end = DateTimeHelper.parseMoment(this.calendarWeek).endOf('isoWeek').format('YYYY-MM-DD');

        const masterRows = [];

        const headings = [{ text: 'Child' }, { text: 'Age', style: 'agehead' }];

        for (const title of this.bookingCalendarTitle) {
            headings.push({ text: `${title.day} ${title.date}` });
        }


        for (let record of this.bookingCalendar) {


            const rows = {};
            rows['Child'] = record.child.getFullName(),
            rows['Age'] = this.getAge(record.child.age).replace(',', ' ')

            _.forEach(record.items, week => {

                rows[this.getWeekDays(week.day_name)] = week.booking.length > 0 ? (this.showSessionTime ? _.map(week.booking, book => { return `${this._timeConvert.transform(book.sessionStart, '12h')} - ${this._timeConvert.transform(book.sessionEnd, '12h')}, ` }) : 'yes') : '-'

            });

            masterRows.push(rows);
        }

        console.log('csv master row', masterRows);



        if (masterRows.length > 0) {
            const csvData = this.objectToCsvUtilisationReport(masterRows, start, end);

            console.log('csvData', csvData);

            this._csvService
                .downLoadCsvFile(csvData, 'Roll Book Report');
        }

        else {
            setTimeout(() => this._notification.displaySnackBar('No data found', NotifyType.INFO), 200);
            return;
        }

    }

    getWeekDays(day): string{
        
      const title =   this.bookingCalendarTitle.find(v=> v.day.substring(0,3) ===  day);

        return `${title.day} (${title.date})`;
    }

    objectToCsvUtilisationReport(data, start, end): any {
        const csvRows = [];
        const headers = Object.keys(data[0])

        csvRows.push(headers.join(','))
        for(const row of data) {
           const value = headers.map(header =>{
            //    const escaped = row[header].replace(/"/g, '\\"');
            //     return `"${escaped}"`
            return row[header];
            });

            csvRows.push(value.join(','));
            
        }

        const actualRows  = [];

        actualRows.push('Actual');
        actualRows.push('');

        _.forEach(this.bookingCalendarTitle, title => {

            actualRows.push(title.weekSummary.attended)

        });

        csvRows.push(actualRows.join(','));



        const scheduled: Array<any> = [];
        scheduled.push('Booked');
        scheduled.push('');

        _.forEach(this.bookingCalendarTitle, title => {

            scheduled.push(title.weekSummary.bookings)

        });

        csvRows.push(scheduled.join(','));



        const capacity: Array<any> = [];
        capacity.push('Capacity');
        capacity.push('');


        _.forEach(this.bookingCalendarTitle, title => {

            capacity.push(title.weekSummary.capacity)

        });

        csvRows.push(capacity.join(','));



        const actualCapacityPer: Array<any> = [];
        actualCapacityPer.push('Actual Capacity %');
        actualCapacityPer.push('');

        _.forEach(this.bookingCalendarTitle, title => {

            actualCapacityPer.push(this.getPer(title.weekSummary.attended, title.weekSummary.bookings, title.weekSummary.capacity, true)
            )

        });

        csvRows.push(actualCapacityPer.join(','));



        const scheduledCapacityPer: Array<any> = [];
        scheduledCapacityPer.push('Booked Capacity %');
        scheduledCapacityPer.push('');
        
        _.forEach(this.bookingCalendarTitle, title => {

            scheduledCapacityPer.push(this.getPer(title.weekSummary.attended, title.weekSummary.bookings, title.weekSummary.capacity, false)
            )

        });


        csvRows.push(scheduledCapacityPer.join(','));

        const totalActual: Array<any> = [];

        totalActual.push('Total Actual');
        totalActual.push('');
        totalActual.push('');
        totalActual.push('');
        totalActual.push('');
        totalActual.push('');

        totalActual.push(this.getTotal(true));

        csvRows.push(totalActual.join(','))

        const totalBooked: Array<any> = [];

        totalBooked.push('Total Booked');
        totalBooked.push('');
        totalBooked.push('');
        totalBooked.push('');
        totalBooked.push('');
        totalBooked.push('');

        totalBooked.push(this.getTotal(false));

        csvRows.push(totalBooked.join(','))


        const totalChild: Array<any> = [];

        totalChild.push('Total Children');
        totalChild.push('');
        totalChild.push('');
        totalChild.push('');
        totalChild.push('');
        totalChild.push('');

        totalChild.push(this.bookingCalendar.length);

        csvRows.push(totalChild.join(','))

        
        csvRows.unshift(`Weekly Roll Report ${start} - ${end}`)
            
        csvRows.unshift('Weekly Roll Report');

        console.log(csvRows);

        return csvRows.join('\n');

        
    }

    

    getUtilisationReportPdf(): any {

        const debitdata: Array<any> = [];
        const creditdata: Array<any> = [];

        const start = DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek').format('YYYY-MM-DD');
        const end = DateTimeHelper.parseMoment(this.calendarWeek).endOf('isoWeek').format('YYYY-MM-DD');

        const date = `Weekly Roll Report ${start} - ${end} `;
        const room = `Room - ${this.roomName}`;

        const headings = ['Child', {text: 'Age', style: 'agehead'},];

        for (const title of this.bookingCalendarTitle) {
            headings.push(`${title.day} ${title.date}`);
        }

        console.log(headings);

        const headers = _.map(headings, (val) => {
            return {
                text: val,
                color: '#ffffff',
                fillColor: '#009fe9',
                style: 'head'
            };
        });


        debitdata.push(headers);
        console.log(this.bookingCalendar);

        // _.forEach(this.bookingCalendar, (record) => {

        for (let record of this.bookingCalendar) {

            // let hasBooking = record.items.filter(week => week.booking.length > 0)


            // if (!this.careProviderToggle && hasBooking.length < 1) {
                
            //     continue;

            // }

            const rows: Array<any> = [];

            rows.push(
                record.child.getFullName(),
                { text: this.getAge(record.child.age), style: 'age' },
            )
            _.forEach(record.items, week => {

                rows.push(
                    week.booking.length > 0 ? (this.showSessionTime ? _.map(week.booking, book => { return `${this._timeConvert.transform(book.sessionStart, '12h')} - ${this._timeConvert.transform(book.sessionEnd, '12h')}, ` }) : {
                        svg: `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                    viewBox="0 0 507.2 507.2" style="enable-background:new 0 0 507.2 507.2;" xml:space="preserve">
               <circle style="fill:#32BA7C;" cx="253.6" cy="253.6" r="253.6"/>
               <path style="fill:#0AA06E;" d="M188.8,368l130.4,130.4c108-28.8,188-127.2,188-244.8c0-2.4,0-4.8,0-7.2L404.8,152L188.8,368z"/>
               <g>
                   <path style="fill:#FFFFFF;" d="M260,310.4c11.2,11.2,11.2,30.4,0,41.6l-23.2,23.2c-11.2,11.2-30.4,11.2-41.6,0L93.6,272.8
                       c-11.2-11.2-11.2-30.4,0-41.6l23.2-23.2c11.2-11.2,30.4-11.2,41.6,0L260,310.4z"/>
                   <path style="fill:#FFFFFF;" d="M348.8,133.6c11.2-11.2,30.4-11.2,41.6,0l23.2,23.2c11.2,11.2,11.2,30.4,0,41.6l-176,175.2
                       c-11.2,11.2-30.4,11.2-41.6,0l-23.2-23.2c-11.2-11.2-11.2-30.4,0-41.6L348.8,133.6z"/>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               <g>
               </g>
               </svg>`,
                        width: 15,
                        height: 15,
                        style: 'tick'
                    }) : ''
                )

            });
            debitdata.push(rows);

        }

        const actualRows: Array<any> = [];

        actualRows.push(
            { text: 'Actual', bold: true },
            { text: '', bold: true }
        )
        _.forEach(this.bookingCalendarTitle, title => {

            actualRows.push(
                { text: title.weekSummary.attended, bold: true }
            )

        });

        debitdata.push(actualRows);

        const scheduled: Array<any> = [];

        scheduled.push(
            { text: 'Booked', bold: true },
            { text: '', bold: true }
        )
        _.forEach(this.bookingCalendarTitle, title => {

            scheduled.push(
                { text: title.weekSummary.bookings, bold: true }
            )

        });
        debitdata.push(scheduled);

        const capacity: Array<any> = [];

        capacity.push(
            { text: `Capacity [${this.roomName}]`, bold: true },
            { text: '', bold: true }
        )
        _.forEach(this.bookingCalendarTitle, title => {

            capacity.push(
                { text: title.weekSummary.capacity, bold: true }
            )

        });
        debitdata.push(capacity);



        const actualCapacityPer: Array<any> = [];

        actualCapacityPer.push(
            { text: 'Actual Capacity %', bold: true },
            { text: '', bold: true }
        )
        _.forEach(this.bookingCalendarTitle, title => {

            actualCapacityPer.push(
                { text: this.getPer(title.weekSummary.attended, title.weekSummary.bookings, title.weekSummary.capacity, true), bold: true }
            )

        });
        debitdata.push(actualCapacityPer);

        const scheduledCapacityPer: Array<any> = [];

        scheduledCapacityPer.push(
            { text: 'Booked Capacity %', bold: true },
            { text: '', bold: true }
        )
        _.forEach(this.bookingCalendarTitle, title => {

            scheduledCapacityPer.push(
                { text: this.getPer(title.weekSummary.attended, title.weekSummary.bookings, title.weekSummary.capacity, false), bold: true }
            )

        });
        debitdata.push(scheduledCapacityPer);

        debitdata.push([
            { text: 'Total Actual', bold: true },
            '',
            '',
            '',
            '',
            '',
            { text: this.getTotal(true), bold: true }
        ]);

        debitdata.push([
            { text: 'Total Booked', bold: true },
            '',
            '',
            '',
            '',
            '',
            { text: this.getTotal(false), bold: true }
        ]);

        // debitdata.push([
        //     { text: 'Average Actual', bold: true },
        //     '',
        //     '',
        //     '',
        //     '',
        //     '',
        //     { text: this.getTotal(true) / 5, bold: true }
        // ]);

        // debitdata.push([
        //     { text: 'Average Booked', bold: true },
        //     '',
        //     '',
        //     '',
        //     '',
        //     '',
        //     { text: this.getTotal(false) / 5, bold: true }
        // ]);

        // debitdata.push([
        //     { text: 'Average Capacity (Actual) %', bold: true },
        //     '',
        //     '',
        //     '',
        //     '',
        //     '',
        //     { text: this.getTotal(true) / 5 * 100, bold: true }
        // ]);

        // debitdata.push([
        //     { text: 'Average Capacity (Booked) %', bold: true },
        //     '',
        //     '',
        //     '',
        //     '',
        //     '',
        //     { text: this.getTotal(false) / 5 * 100, bold: true }
        // ]);

        debitdata.push([
            { text: 'Total Children', bold: true },
            '',
            '',
            '',
            '',
            '',
            { text: this.bookingCalendar.length, bold: true }
        ]);


        const pageTitle = 'Weekly Roll Report';
        const pageType = 'A4';
        const isLandscape =  false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 }] },
            { text: date, style: 'date' },
            { text: room, style: 'room' },
            {
                table: {
                    widths: [150, 40, 57, 57, 57, 57, 57],
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    // widths: _.fill(new Array(headings.length), 'auto'),
                    body: debitdata
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                    vLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                    hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                    vLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                },
                style: 'table'
            }
        ];

        const styles = {
            header: {
                fontSize: 18,
                margin: [0, 0, 0, 8],
                alignment: 'center',
            },
            head: {
                fontSize: 10,
                alignment: 'center',
            },
            age: {
                fontSize: 10,
                margin: [0, 0, 0, 0],
            },
            date: {
                fontSize: 8,
                margin: [0, 8, 0, 0],
                color: '#969696'
            },
            room: {
                fontSize: 8,
                margin: [0, 8, 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 10,
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 10,
                bold: false,
                margin: [0, 10, 0, 5]
            },
            tick: {
                alignment: 'center',
            }
        };


        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });
    }

    getDataForReport(data: object, isPdf: boolean, getSelectedField: any, report: ReportModel): Observable<any> {
        this.reportType = data['type'];
        const params = new HttpParams()
            .set('filterBy', data['filterBy'])
            .set('child', JSON.stringify(data['child']))
            .set('room', JSON.stringify(data['room']))
            .set('type', data['type'])
            .set('field', data['field'])
            .set('sdate', data['sdate'])
            .set('edate', data['edate']);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-attendance-report`, data)
            .pipe(
                map(response => {
                    if (response.data) {
                        this.report = response.data.map((i: any, idx: number) => new AttendanceReport(i, idx, (response.allrooms || '')));
                        if(this.reportType === 'ATT_ASR')
                        {
                            this.report.sort((a, b) => {
                                if(b.child && a.child)
                                    return a.child.lastName.toUpperCase() < b.child.lastName.toUpperCase()? -1 : 1;
                            });

                            if(data['absence_toggle'] === false){

                                this.report = this.report.filter(v=> v.type == '0');
                            }
                        }
                        this.totalRecords = this.report.length;
                        this.field = getSelectedField;
                    }

                    setTimeout(() => {
                        isPdf ? this.downLoadPdf(report.name, data['sdate'], data['edate']) : this.downLoadCsv(report.name, this.field);
                    }, 500);
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    headingBuilder(type): void {
        if (type === 'ASR') {
            this.reportHeading = 'Attendance Summary Report';
        }
        if (type === 'RBR') {
            this.reportHeading = 'Roll Book Report';
        }

        if (type === 'OUR') {
            this.reportHeading = 'Roll Book Report';
        }
    }
    getPrintViewContent(field: any, report:AttendanceReport[]): Array<any>
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

    downLoadPdf(heading: any, end_date, start_date):void{
        setTimeout(() => {
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

            const content = this.getPrintViewContent(this.field, this.report);
            this._pdfService
            .print('download',this.field, content, heading, dateRange);
        }, 500);
    }

    downLoadCsv(heading: any, field):void{

        const masterRows = [];

            _.map(this.report, (reo) => {
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
            //    const escaped = row[header].replace(/"/g, '\\"');
            //     return `"${escaped}"`
            return row[header];
            });

            csvRows.push(value.join(','));
            
        }
        return csvRows.join('\n');

        
    }

    getCurrentDate():any {
        const currentdate = new Date();
        return  currentdate.getDate() + '/' + (currentdate.getMonth() + 1) + '/' + currentdate.getFullYear();
    }

    buildCalenderViewHeaders(): any
    {

        const items: Array<{ date: string, day: string, weekSummary: { bookings: number, attended: number, absences: number, holidays: number, casual: number, missing: number, incomplete: number, capacity: number } }> = [];

        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.calendarWeek).endOf('isoWeek'));

        for (const item of dateRange)
        {
            if (this.calenderSettings.hideWeekEnd && (item.day() === 6 || item.day() === 0))
            {
                continue;
            }
            
            let weekTotalBookings = 0;
            let weekTotalAbsence = 0;
            let weekTotalHoliday = 0;
            let weekTotalAttended = 0;
            let weekTotalCasual = 0;
            let weekTotalMissing = 0;
            let weekTotalInCompleted = 0;
            let weekTotalRoomCapacity = 0;

            for (const child of this.children)
            {
                const bookings = this.bookings.filter(i => i.child.id === child.id && i.date === item.format('YYYY-MM-DD'));

                if (bookings.length > 0)
                {
                    weekTotalBookings += (bookings.length);
                    weekTotalAbsence += (bookings.filter(i => i.isAbsent()).length);
                    weekTotalHoliday += (bookings.filter(i => i.isHoliday()).length);
                    weekTotalCasual += (bookings.filter(i => i.isCasual).length);
                    weekTotalAttended += (bookings.filter(i => !i.isAbsent() && i.attendance).length);
                    weekTotalMissing += (bookings.filter(i => !i.isAbsent() && !i.attendance).length);
                    weekTotalInCompleted += (bookings.filter(i => !i.isHoliday() && !i.isAbsent() && (i.attendance && !i.attendance.checkOutTime)).length);

                    // weekTotalBookings += (bookings.filter(book => book.attendance === null).length);
                    // weekTotalAbsence += (bookings.filter(i => i.isAbsent()).length);
                    // weekTotalHoliday += (bookings.filter(i => i.isHoliday()).length);
                    // weekTotalCasual += (bookings.filter(i => i.isCasual).length);
                    // weekTotalAttended += (bookings.filter(i => !i.isAbsent() && i.attendance).length);
                    // weekTotalMissing += (bookings.filter(i => !i.isAbsent() && !i.attendance).length);
                    // weekTotalInCompleted += (bookings.filter(i => !i.isHoliday() && !i.isAbsent() && (i.attendance && !i.attendance.checkOutTime)).length);
                }
            }

            // room
             for (const room of ((this.filterBy.room !== '0' && this.filterBy.room) ? this.rooms.filter(i => i.id === this.filterBy.room) : this.rooms))
             {
                 console.log( _.find(this.rooms, ['id', this.filterBy.room]));
                 
                 console.log(room);
                 
                 weekTotalRoomCapacity += room.getRoomCapacity(item.format('YYYY-MM-DD'));
             }

            items.push({
                date: item.format('YYYY-MM-DD'),
                day: _.capitalize(item.format('dddd')),
                weekSummary: {
                    bookings: weekTotalBookings,
                    absences: weekTotalAbsence,
                    holidays: weekTotalHoliday,
                    attended: weekTotalAttended,
                    casual: weekTotalCasual,
                    missing: weekTotalMissing,
                    incomplete: weekTotalInCompleted,
                    capacity: weekTotalRoomCapacity
                }            
            });
        }

        return items;
    }

    /**
     * build calender layout
     */
    buildCalenderView(): any
    {
        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.calendarWeek).endOf('isoWeek'));

        // reset calendar view
        this.bookingCalendar = [];


        setTimeout(() => 
        {
            for (const child of this.children)
            {
                
                // child filter
                if(this.filterBy.child !== '0' && this.filterBy.child !== null && child.id !== this.filterBy.child)
                {
                    continue;
                }

                // room filter
                if(this.filterBy.room !== '0' && this.filterBy.room &&  child.rooms.filter(i => i.id === this.filterBy.room).length < 1)
                {
                    continue;
                }

                if(!this.showInactive && !child.isActive()){
                    continue;
                }

                const weekItem: BookingCalendarItem[] = [];

                for (const item of dateRange)
                {
                    if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
                    {
                        continue;
                    }

                    weekItem.push({
                        id: uuid.v4(),
                        date: item.toDate(),
                        day_number: item.format('DD'),
                        day_name: _.capitalize(item.format('ddd')),
                        day_month: _.capitalize(item.format('MMM')),
                        week_end: item.day() === 6 || item.day() === 0,
                        current_month: DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('month').format('MM') === item.clone().startOf('month').format('MM'),
                        booking: _.sortBy(this.bookings.filter(i => i.date === item.format('YYYY-MM-DD') && i.child.id === child.id), slot => slot.sessionStart)
                        // booking: _.sortBy(this.bookings.filter(i => i.date === item.format('YYYY-MM-DD') && i.child.id === child.id && i.attendance === null), slot => slot.sessionStart)
                    });
                }

                const hasBooking = weekItem.filter(v=> v.booking.length >0)

                if(!this.careProviderToggle && hasBooking.length < 1) {

                    continue;
                }

                this.bookingCalendar.push({
                    child: child,
                    items: weekItem,
                    selected: false
                });

                if(this.filterBy.room === '0'){
                   console.log('isAll room selected');
                   
                   
                }

            }
            
        });

    }

    getAllRooms(getadminonlyrooms : boolean = false): Promise<void>
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

                        return {
                            items: this.rooms
                        };
                    }),
                    shareReplay()
            )
            .subscribe(
                (response: any) =>
                {
                    // this.onRoomChanged.next(response);

                    resolve();
                },
                reject
            );
        });
        
    }

    getAge(age: string): string {

        return age.split("and")[0].replace("years","y").replace("months","m");
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
        this.onChildrenBookingDataChanged.next([]);

        // reset all variables
        this.pagination = null;
        this.filterBy = null;
        this.sortBy = null;
        this.field = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
        this.field  = null;
        this.report = null
    }

    clearLastRememberOptions(): void
    {
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

    getChildren(): Promise<void>
    {
        return new Promise((resolve, reject) => 
        {
            this._childrenService
                .getChildrenList()
                .pipe(first())
                .subscribe(
                    (response: Child[]) =>
                    {
                        this.children = response;

                        this.children = [...this._orderByPipe.transform(
                            this.children, 
                            this.mapOfSort.find(i => i.value === 'lastNameAsc').mapValue.value + this.mapOfSort.find(i => i.value === 'lastNameAsc').mapValue.key
                        )];
                        this.onChildrenChanged.next(this.children);
                        
                        resolve();
                    },
                    reject
                );
        });
    }
}

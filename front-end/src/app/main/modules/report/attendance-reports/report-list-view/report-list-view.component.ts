import { Component, OnInit, ViewEncapsulation, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ContactReportservice } from '../../service/contact-report.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs/internal/Subject';
import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';
import { AttendanceReportservice } from '../../service/attendance-report.service';
import { AttendanceReport } from '../model/attendance-report.model';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { BookingMasterRollItem } from 'app/main/modules/booking-master-roll/calendar-week-view/calendar-week-view.component';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { Child } from 'app/main/modules/child/child.model';
import { BookingCalendarItem } from 'app/main/modules/child/booking/calendar-view/calendar-view.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as uuid from 'uuid';
import { OrderByPipe } from 'ngx-pipes';
import { ReportDependencyervice } from '../../service/report-dependencey.service';
import { Room } from 'app/main/modules/room/models/room.model';

@Component({
    selector: 'attendance-report-list-view',
    templateUrl: './report-list-view.component.html',
    styleUrls: ['./report-list-view.component.scss'],
    providers: [
        OrderByPipe,
    ],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AttendanceReportListViewComponent implements OnInit, OnDestroy {

    @ViewChild('htmlData') htmlData:ElementRef;
    private _unsubscribeAll: Subject<any>;
    reportList: AttendanceReport[];
    totalRecords: any;
    field: any = [];
    tableLoading: boolean;
    reportType:string;
    hideWeekEnd: boolean;
    bookingCalendarTitle: any;
    bookingCalendar: BookingMasterRollItem[];


    calendarWeek: any;
    bookings: Booking[];
    children: Child[];
    rooms: Room[];
    roomName: string;
    showSessionTime: boolean;

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
    

  constructor(
        private _attendanceReportService: AttendanceReportservice,
        private _logger: NGXLogger,
        private _orderByPipe: OrderByPipe,
        private _reportDependencyervice:ReportDependencyervice
    ) 
    {
        this._unsubscribeAll = new Subject();
        this.reportList = [];
        this.bookingCalendar = [];
        this.field = _attendanceReportService.field;
        this.hideWeekEnd = this._attendanceReportService.calenderSettings.hideWeekEnd;
    }

  ngOnInit() {

        this._attendanceReportService
            .onReportChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report list view]', response);

                this.reportList = response.records;
                this.totalRecords = response.total;
                this.field = response.selectedField;
                this.reportType = response.type;
            });

            // Subscribe to table loader changes
        this._attendanceReportService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

      this._reportDependencyervice
          .onRoomChanged
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((rooms: any) => {
              this._logger.debug('[rooms-list]', rooms);
              this.rooms = rooms.items;
          });

            this._attendanceReportService
            .onChildrenBookingDataChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(booking =>
            {
                this._logger.debug('[booking]', booking);
                this.bookingCalendar = booking.bookings;
                this.reportType = booking.type;
                this.bookingCalendarTitle = booking.header;
                this.roomName = booking.roomName;
                this.showSessionTime = booking.session_time;
            });

  }

  ngOnDestroy(): void {

    this.setDefault();
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this._attendanceReportService.unsubscribeOptions();

}

  setDefault(): void {
      
        this.reportList = [];
        this.totalRecords = null;
        this.field = [];
        this.reportType = '';
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    getAge(age: string): string {

        return age.split("and")[0].replace("years","y").replace("months","m");
    }

    getTableElement(booking: Booking): string {

        console.log(booking);
        
        return booking? booking.sessionStart + ' - '+ booking.sessionEnd : '' ;
    }

    getPer(actual: number, scheduled: number, capacity: number, isActual: boolean): any{

        if(actual !== 0 || capacity != 0 || scheduled != 0) {
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

}

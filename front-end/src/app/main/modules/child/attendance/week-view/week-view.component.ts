import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntil, distinctUntilChanged, startWith, skip } from 'rxjs/operators';
import { Subject, Observable } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';

import { ChildAttendanceService } from '../services/attendance.service';
import { AuthService } from 'app/shared/service/auth.service';

import { Child } from '../../child.model';
import { Booking } from '../../booking/booking.model';
import { AuthClient } from 'app/shared/model/authClient';
import { AttendanceSummary } from '../attendance.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { ChildBookingService } from '../../booking/services/booking.service';
import {CommonService} from '../../../../../shared/service/common.service';

export interface AttendanceItem {
    id: string;
    date: string;
    day: string;
    items: Booking[];
}

@Component({
    selector: 'attendance-week-view',
    templateUrl: './week-view.component.html',
    styleUrls: ['./week-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AttendanceWeekViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    weekCalendarLoading: boolean;
    calendarWeek: FormControl;

    child: Child;
    attendance: Booking[];
    client: AuthClient;

    attendanceCalendar: AttendanceItem[];
    hideWeekEnd: boolean;
    showBookingDetails: boolean;

    @ViewChild('weekPicker')
    weekCalenderInput: ElementRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {ChildAttendanceService} _attendanceService
     * @param {AuthService} _authService
     * @param {ChildBookingService} _bookingService
     * @param _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _attendanceService: ChildAttendanceService,
        private _authService: AuthService,
        private _bookingService: ChildBookingService,
        private _commonService: CommonService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.weekCalendarLoading = false;
        this.hideWeekEnd = this._bookingService.calenderSettings.hideWeekEnd;
        this.showBookingDetails = false;
        this.calendarWeek = new FormControl(DateTimeHelper.now().toDate());

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('attendance - week view !!!');

        // Subscribe to child enrolment changes
        this._attendanceService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) => 
            {
                this._logger.debug('[child attendance - child]', child);

                this.child = child;
            });
        
        // Subscribe to child attendance changes
        this._attendanceService
            .onChildAttendanceChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => 
            {
                this._logger.debug('[child attendance - week view]', response);

                this.attendance = response;

                setTimeout(() => this.buildCalenderView(), 250);
            });

        // Subscribe to view loader changes
        this._attendanceService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.weekCalendarLoading = value);
        
        // Subscribe to form value changes
        this.calendarWeek
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                startWith(this.calendarWeek.value),
                distinctUntilChanged(),
                skip(1)
            )
            .subscribe(value =>
            {
                if (_.isNull(value))
                {
                    return;    
                }

                this.triggerCalendarLoad();
            });

        // Subscribe to view loader changes
        this._attendanceService
            .onShowBookingDetailView
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this.showBookingDetails = value;

                setTimeout(() => this.updateScroll(), 250);
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * update page scroll
     */
    updateScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    /**
     * show month view selector
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    toggleCalendar(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        (<HTMLElement> (<HTMLElement> this.weekCalenderInput.nativeElement).querySelector('.ant-picker-input')).click();
    }

    /**
     * go to next month
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    calendarNext(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        this.calendarWeek.patchValue(DateTimeHelper.parseMoment(this.calendarWeek.value).add(1, 'w').toDate());
    }

    /**
     * go to previous month
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    calendarPrevious(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        this.calendarWeek.patchValue(DateTimeHelper.parseMoment(this.calendarWeek.value).subtract(1, 'w').toDate());
    }
    
    /**
     * get calendar label
     *
     * @returns {string}
     */
    getCalendarTitle(): any
    {
        const date = DateTimeHelper.parseMoment(this.calendarWeek.value);

        return {
            week: date.startOf('isoWeek').format('DD') + ' to ' + date.endOf('isoWeek').format('DD') + ' of ' + date.format('MMMM YYYY'),
            weekNumber: date.isoWeek() < 10 ? '0' + date.isoWeek() : date.isoWeek()
        };
    }

    /**
     * load calendar dates
     *
     * @returns {void}
     */
    triggerCalendarLoad(): void
    {
        if (this.weekCalendarLoading)
        {
            return;
        }
        
        this._attendanceService.onCalendarDateChanged.next({
            start: DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek').format('YYYY-MM-DD'),
            end: DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek').format('YYYY-MM-DD')
        });
    }

    /**
     * build calender layout
     */
    buildCalenderView(): void
    {
        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek'));

        // reset calendar view
        this.attendanceCalendar = [];

        setTimeout(() =>
        {
            for (const item of dateRange)
            {
                if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
                {
                    continue;
                }

                this.attendanceCalendar.push({
                    id: uuid.v4(),
                    date: item.format('YYYY-MM-DD'),
                    day: _.capitalize(item.format('dddd')),
                    items:  _.sortBy(this.attendance.filter(i => i.date === item.format('YYYY-MM-DD')), i => i.sessionStart)
                });
            }
        });
    }

    /**
     * get current week attendance summary
     *
     * @returns {AttendanceSummary}
     */
    getAttendanceSummary(): AttendanceSummary
    {
        let booked = 0;
        let attended = 0;
        let noAttendance = 0;
        let notCompleted = 0;
        let absence = 0;
        let holiday = 0;

        for (const item of this.attendance) 
        {
            if (!_.isNull(item.attendance))
            {
                if(item.attendance.isAbsence())
                {
                    absence += 1;
                }
                else if (item.attendance.isCompleted())
                {
                    attended += 1;    
                }
                else
                {
                    notCompleted += 1;
                }
            }
            else
            {
                if (!item.isHoliday() && !item.isAbsent())
                {
                    noAttendance += 1;
                }
                else if(item.isHoliday())
                {
                    holiday += 1;
                }
            }

            booked += 1;
        }

        return {
            booked: booked,
            attended: attended,
            noAttendance: noAttendance,
            notCompleted: notCompleted,
            absence: absence,
            holiday: holiday
        };
    }

    getChildProfileImage(item) : string
    {
        if(item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }
}

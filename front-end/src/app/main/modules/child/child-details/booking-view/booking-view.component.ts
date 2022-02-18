import { Component, OnInit, ViewEncapsulation, OnDestroy, EventEmitter, Input, Output, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { distinctUntilChanged, skip, startWith, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { ChildrenService } from '../../services/children.service';
import { AuthService } from 'app/shared/service/auth.service';
import { ChildBookingService } from '../../booking/services/booking.service';

import { Child } from '../../child.model';
import { AuthClient } from 'app/shared/model/authClient';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Booking } from '../../booking/booking.model';
import { BookingCalendarItem } from '../../booking/calendar-view/calendar-view.component';

@Component({
    selector: 'child-detail-booking-view',
    templateUrl: './booking-view.component.html',
    styleUrls: ['./booking-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildBookingViewComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    client: AuthClient;
    bookings: Booking[];
    bookingCalendar: BookingCalendarItem[];
    weekCalendarLoading: boolean;
    buttonLoader: boolean;
    hideWeekEnd: boolean;

    calendarWeek: FormControl;

    @Input() selected: Child;

    @ViewChild('weekView')
    weekCalenderInput: ElementRef;

    @Output()
    updateScroll: EventEmitter<any>;
    
    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildrenService} _childrenService
     * @param {AuthService} _authService
     * @param {ChildBookingService} _bookingService
     */
    constructor(
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _authService: AuthService,
        private _bookingService: ChildBookingService,
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.bookings = [];
        this.bookingCalendar = [];
        this.weekCalendarLoading = false;
        this.buttonLoader = false;
        this.hideWeekEnd = this._bookingService.calenderSettings.hideWeekEnd;

        this.calendarWeek = new FormControl(DateTimeHelper.now().toDate());
        
        this.updateScroll = new EventEmitter();

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
        this._logger.debug('child details - booking view !!!');

        // Initial reference
        this.child = this.selected;

        // Subscribe to update current child on changes
        this._childrenService
            .onCurrentChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentChild =>
            {
                this.child = (!currentChild) ? null : currentChild;

                if (!_.isNull(this.child)) 
                {
                    // reset calendar view
                    this.bookings = [];
                    this.bookingCalendar = [];

                    this.buildCalenderView();

                    setTimeout(() => this.calendarWeek.setValue(DateTimeHelper.now().toDate()), 150);
                }
            });

        // Subscribe to booking changes
        this._bookingService
            .onChildBookingChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[child booking]', response);

                this._childrenService.onDetailViewContentChanged.next(false);

                this.bookings = [...response];

                setTimeout(() => this.buildCalenderView(), 150);
            });

        // Subscribe to view loader changes
        this._bookingService
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
    }

    ngAfterViewInit(): void 
    {
        this.buildCalenderView();

        // detail view initial load
        setTimeout(() => this.calendarWeek.setValue(DateTimeHelper.now().toDate()), 50);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.updateScroll.unsubscribe();

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
     * get calendar label
     *
     * @returns {string}
     */
    getCalendarTitle(): string
    {
        return !_.isNull(this.calendarWeek.value) 
            ? DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek').format('DD') + ' - ' + DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek').format('DD') + ' of ' + DateTimeHelper.parseMoment(this.calendarWeek.value).format('MMMM YYYY')
            : null;
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

        this._childrenService.onDetailViewContentChanged.next(true);

        this._bookingService.getWeekBookingsByChild(this.child.id, {
            start: DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek').format('YYYY-MM-DD'),
            end: DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek').format('YYYY-MM-DD')
        });
    }

    /**
     * build calender layout
     */
    buildCalenderView(): void
    {
        // reset 
        this.bookingCalendar = [];

        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek'));

        setTimeout(() =>
        {
            for (const item of dateRange)
            {
                if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
                {
                    continue;
                }
                    
                this.bookingCalendar.push({
                    id: uuid.v4(),
                    date: item.toDate(),
                    day_number: item.format('DD'),
                    day_name: _.capitalize(item.format('dddd')),
                    day_month: _.capitalize(item.format('MMM')),
                    week_end: item.day() === 6 || item.day() === 0,
                    current_month: DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('month').format('MM') === item.clone().startOf('month').format('MM'),
                    booking: _.sortBy(this.bookings.filter(i => i.date === item.format('YYYY-MM-DD')), slot => slot.sessionStart)
                });
            }
        });
    }

}

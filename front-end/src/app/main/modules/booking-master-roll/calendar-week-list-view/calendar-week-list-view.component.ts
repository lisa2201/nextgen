import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntil, startWith, distinctUntilChanged, skip } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';

import { AuthService } from 'app/shared/service/auth.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { BookingMasterRollCoreService } from '../services/booking-core.service';

import { Booking } from '../../child/booking/booking.model';
import { Child } from '../../child/child.model';
import { Room } from '../../room/models/room.model';
import { Fee } from '../../centre-settings/fees/model/fee.model';
import { AuthClient } from 'app/shared/model/authClient';
import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { ManageMasterRollCalenderListViewFilterComponent } from '../sidenavs/right/manage-master-roll-calender-list-view-filter/manage-master-roll-calender-list-view-filter.component';

export interface BookingMasterRollLisViewDayItems {
    id: string;
    child: Child;
    booking: Booking[];
    selected: boolean;
}

export interface BookingMasterRollLisViewItem {
    date: Date;
    day: string;
    capacity: number;
    items: BookingMasterRollLisViewDayItems[]
}

@Component({
    selector: 'booking-master-roll-calendar-week-list-view',
    templateUrl: './calendar-week-list-view.component.html',
    styleUrls: ['./calendar-week-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingMasterRollCalendarWeekListViewComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    calendarWeek: FormControl;
    weekCalendarLoading: boolean;
    hideWeekEnd: boolean;
    hideBookingInfo: boolean;
    allChildrenChecked: boolean;
    indeterminateChildren: boolean;

    bookings: Booking[];
    children: Child[];
    fees: Fee[];
    rooms: Room[];
    client: AuthClient;
    absenceReasons: any;

    bookingCalendar: BookingMasterRollLisViewItem[];

    filterBy: any | null = null;

    viewHelpPanel: boolean;
    bookingTypes: typeof AppConst.bookingTypes;

    generateWeekView: boolean;
    isChildrenViewLimited: boolean;

    defaultFilterValues: any;

    @ViewChild('weekPicker')
    weekCalenderInput: ElementRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    @ViewChild(ManageMasterRollCalenderListViewFilterComponent)
    filterComponent: ManageMasterRollCalenderListViewFilterComponent;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _masterRollService: BookingMasterRollCoreService,
        private _authService: AuthService,
        private _fuseSidebarService: FuseSidebarService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.bookings = [];
        this.children = [];
        this.rooms = [];
        this.fees = [];
        this.weekCalendarLoading = false;
        this.hideWeekEnd = this._masterRollService.calenderSettings.hideWeekEnd;
        this.hideBookingInfo = false;
        this.allChildrenChecked = false;
        this.indeterminateChildren = false;
        this.viewHelpPanel = false;
        this.bookingTypes = AppConst.bookingTypes;
        this.generateWeekView = false;
        this.isChildrenViewLimited = false;
        this.defaultFilterValues = null;

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
        this._logger.debug('master roll booking - calendar list view');

        // Subscribe to booking changes
        this._masterRollService
            .onChildrenBookingChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((bookings: Booking[]) => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._logger.debug('[list view] [child booking]', bookings);

                this.bookings = bookings;

                if (!this.generateWeekView)
                {
                    return;
                }

                setTimeout(() => this.buildCalenderView(), 50);
            });

        // Subscribe to children changes
        this._masterRollService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((children: Child[]) => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._logger.debug('[list view] [children]', children);

                this.children = children;

                this.bookingInitialLoad();
            });

        // Subscribe to fee changes
        this._masterRollService
            .onFeeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((fees: Fee[]) => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._logger.debug('[list view] [fees]', fees);

                this.fees = fees;
            });

        // Subscribe to room changes
        this._masterRollService
            .onRoomsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: Room[]) => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._logger.debug('[list view] [rooms]', rooms);

                this.rooms = rooms;

                this.bookingInitialLoad();
            });

        // Subscribe to filter changes
        this._masterRollService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._logger.debug('[list view] [filter]', filter);

                this.filterBy = filter;
            });

        // Subscribe to initial booking loader changes
        this._masterRollService
            .triggerInitialBooking
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this.generateWeekView = value
            });

        // Subscribe to view loader changes
        this._masterRollService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this.weekCalendarLoading = value
            });

        // Subscribe to children view limited changes
        this._masterRollService
            .isChildrenViewLimited
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this.isChildrenViewLimited = value;
            });

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
                if (_.isNull(value) || !this._masterRollService.isValidViewHolder(this.constructor.name))
                {
                    return;    
                }

                this.triggerCalendarLoad();
            });
    }

    /**
     * On after view init
     */
    ngAfterViewInit(): void 
    {
        setTimeout(() => this.defaultFilterValues = this.defaultFilterValue, 0);
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
     * toggle sidebar
     *
     * @param {MouseEvent} e
     */
    toggleSidebar(name: string): void
    {
        if (this.weekCalendarLoading)
        {
            return;    
        }

        this._fuseSidebarService.getSidebar(name).toggleOpen();
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
     * check if calender filter form changed
     *
     * @readonly
     * @type {boolean}
     */
    get filterFormChanged(): boolean
    {
        return (typeof this.filterComponent !== 'undefined') ? this.filterComponent.isFilterOn : false;
    }

    /**
     * get filter default values
     *
     * @readonly
     * @type {*}
     */
    get defaultFilterValue(): any
    {
        return (typeof this.filterComponent !== 'undefined') ? this.filterComponent.formDefaultValues : null;
    }

    /**
     * check if filter is on
     *
     * @readonly
     * @type {boolean}
     */
    get isFilterOn(): boolean
    {
        return !this.isChildrenViewLimited && this.filterFormChanged;
    }

    /**
     * clear filters
     *
     * @param {MouseEvent} e
     */
    clearFilter(e: MouseEvent): void
    {
        if (this.weekCalendarLoading)
        {
            return;    
        }
        
        this.filterComponent.clearFilter(e);
    }

    /*----------------------------------------------------------------------------*/

    /**
     * on tab index change
     *
     * @param {*} event
     */
    onTabChange(event: any): void
    {
        setTimeout(() => this._masterRollService.broadcastChildSelection.next([]), 0);
    }

    /**
     * hide or show booking list
     *
     * @param {MouseEvent} e
     */
    toggleBookingDetails(e: MouseEvent): void
    {
        e.preventDefault();

        this.hideBookingInfo = !this.hideBookingInfo;
    }

    /**
     * refetch bookings
     *
     * @param {*} event
     */
    fetchBookings(event: any): void
    {
        this.triggerCalendarLoad();
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

        this._masterRollService.onCalendarDateChanged.next({
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
        this.bookingCalendar = [];

        setTimeout(() => 
        {
            for (const item of dateRange)
            {
                if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
                {
                    continue;
                }

                const dayItem: BookingMasterRollLisViewDayItems[] = [];

                for (const child of this.children)
                {   
                    // child filter
                    if(this.filterBy && this.filterBy.child !== '0' && child.id !== this.filterBy.child)
                    {
                        continue;
                    }
                    
                    // room filter
                    if(this.filterBy && this.filterBy.room !== '0' && child.rooms.filter(i => i.id === this.filterBy.room).length < 1)
                    {
                        continue;
                    }

                    dayItem.push({
                        id: uuid.v4(),
                        child: child,
                        booking: _.sortBy(this.bookings.filter(i => i.date === item.format('YYYY-MM-DD') && i.child.id === child.id), slot => slot.sessionStart),
                        selected: false
                    });
                }

                // room capacity
                let weekTotalRoomCapacity = 0;

                for (const room of ((this.filterBy && this.filterBy.room !== '0') ? this.rooms.filter(i => i.id === this.filterBy.room) : this.rooms))
                {
                    weekTotalRoomCapacity += room.getRoomCapacity(item.format('YYYY-MM-DD'));
                }

                this.bookingCalendar.push({
                    date: item.toDate(),
                    day: _.capitalize(item.format('dddd')),
                    items: dayItem,
                    capacity: weekTotalRoomCapacity
                });
            }
        }, 100)
    }

    /**
     * initial week of booking view loader
     */
    bookingInitialLoad(): void
    {
        if (this.children.length > 0 && this.rooms.length > 0)
        {
            setTimeout(() => this._masterRollService.setInitialBookingView(this.children, this.rooms), 200);
        }
    }
}

import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, ElementRef, ViewContainerRef, TemplateRef, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntil, distinctUntilChanged, finalize, startWith, skip } from 'rxjs/operators';
import { Subject, forkJoin, interval } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';

import { AuthService } from 'app/shared/service/auth.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { ChildBookingService } from '../../child/booking/services/booking.service';
import { NavigationService } from 'app/shared/service/navigation.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { CommonService } from '../../../../shared/service/common.service';
import { BookingMasterRollCoreService } from '../services/booking-core.service';

import { Child } from '../../child/child.model';
import { Booking } from '../../child/booking/booking.model';
import { Fee } from '../../centre-settings/fees/model/fee.model';
import { Room } from '../../room/models/room.model';
import { AuthClient } from 'app/shared/model/authClient';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { BookingSessionType } from 'app/shared/enum/booking-session-type.enum';
import { BookingCalendarItem } from '../../child/booking/calendar-view/calendar-view.component';
import { CurrencyPipe } from '@angular/common';
import { OrderByPipe } from 'ngx-pipes';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ScrollEvent } from 'app/shared/directives/scroll-event/scroll-event.directive';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { ChildAddEditSingleBookingComponent } from '../../modules-shared/booking/dialogs/add-edit-single-booking/add-edit-single-booking.component';
import { ManagerMasterRollCalenderFilterComponent } from '../sidenavs/right/manager-master-roll-calender-filter/manager-master-roll-calender-filter.component';

export interface BookingMasterRollItem {
    child: Child;
    items: BookingCalendarItem[];
    selected: boolean;
}

@Component({
    selector: 'booking-master-roll-calendar-week-view',
    templateUrl: './calendar-week-view.component.html',
    styleUrls: ['./calendar-week-view.component.scss'],
    providers: [
        OrderByPipe,
        CurrencyPipe
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
export class BookingMasterRollCalendarWeekViewComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    weekCalendarLoading: boolean;
    hideWeekEnd: boolean;
    calendarWeek: FormControl;
    bookingCalendarTitle: any;
    bookingCalendar: BookingMasterRollItem[];

    allChildrenChecked: boolean;
    indeterminateChildren: boolean;

    bookings: Booking[];
    children: Child[];
    fees: Fee[];
    rooms: Room[];
    client: AuthClient;
    absenceReasons: any;

    sortSelect: FormControl;
    mapOfSort: Array<any> = [
        {
            name: 'First Name (A - Z)',
            value: 'firstNameAsc',
            mapValue: {
                key: 'firstName',
                value: ''
            }
        },
        {
            name: 'First Name (Z - A)',
            value: 'firstNameDesc',
            mapValue: {
                key: 'firstName',
                value: '-'
            }
        },
        {
            name: 'Last Name (A - Z)',
            value: 'lastNameAsc',
            mapValue: {
                key: 'lastName',
                value: ''
            }
        },
        {
            name: 'Last Name (Z - A)',
            value: 'lastNameDesc',
            mapValue: {
                key: 'lastName',
                value: '-'
            }
        }
    ];

    filterBy: any | null;

    dialogRef: any;

    lazyInterval: any;
    listScrollPositionY: number;

    generateWeekView: boolean;
    isChildrenViewLimited: boolean;

    roomSelect: FormControl;

    defaultFilterValues: any;

    @ViewChild('calendarViewPort')
    calenderViewPort: ElementRef;

    @ViewChild('calendarViewPortContainer', { read: ViewContainerRef })
    calendarViewPortContainer: ViewContainerRef;

    @ViewChild('listViewItem', { read: TemplateRef }) 
    calendarViewPortListItem: TemplateRef<any>;

    @ViewChild('emptyBlock', { read: TemplateRef }) 
    calendarViewPortEmpty: TemplateRef<any>;

    @ViewChild('weekPicker')
    weekCalenderInput: ElementRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    @ViewChild(ManagerMasterRollCalenderFilterComponent)
    filterComponent: ManagerMasterRollCalenderFilterComponent;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildBookingService} _bookingService
     * @param {BookingMasterRollCoreService} _masterRollService
     * @param {AuthService} _authService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {MatDialog} _matDialog
     * @param {NotificationService} _notification
     * @param {NavigationService} _navService
     * @param {OrderByPipe} _orderByPipe
     * @param {CurrencyPipe} _currencyPipe
     */
    constructor(
        private _logger: NGXLogger,
        private _bookingService: ChildBookingService,
        private _masterRollService: BookingMasterRollCoreService,
        private _authService: AuthService,
        private _fuseSidebarService: FuseSidebarService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _navService: NavigationService,
        private _orderByPipe: OrderByPipe,
        private _commonService: CommonService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.bookings = [];
        this.children = [];
        this.rooms = [];
        this.fees = [];
        this.filterBy = null;
        this.weekCalendarLoading = false;
        this.hideWeekEnd = this._masterRollService.calenderSettings.hideWeekEnd;
        this.bookingCalendar = [];
        this.bookingCalendarTitle = [];
        this.allChildrenChecked = false;
        this.indeterminateChildren = false;
        this.lazyInterval = null;
        this.listScrollPositionY = null;
        this.generateWeekView = false;
        this.isChildrenViewLimited = false;
        this.defaultFilterValues = null;

        this.calendarWeek = new FormControl(DateTimeHelper.now().toDate());
        this.sortSelect = new FormControl(this.mapOfSort[0].value);
        this.roomSelect = new FormControl(null);
        
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
        this._logger.debug('booking master roll - calendar view !!!');

        // Subscribe to booking changes
        this._masterRollService
            .onChildrenBookingChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((bookings: Booking[]) => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._logger.debug('[child booking]', bookings);

                this.bookings = bookings;

                this._masterRollService.broadcastChildSelection.next([]);

                this.resetChildrenSelection();

                if (!this.generateWeekView)
                {
                    return;
                }

                setTimeout(() => 
                {
                    this.bookingCalendarTitle = [...this.buildCalenderViewHeaders()];

                    this.buildCalenderView(); 
                }, 50);
            });

        // Subscribe to children changes
        this._masterRollService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((children: Child[]) => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._logger.debug('[children]', children);

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

                this._logger.debug('[children fees]', fees);

                this.fees = fees;
            });

        // Subscribe to room changes
        this._masterRollService
            .onRoomsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: Room[]) => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._logger.debug('[children rooms]', rooms);

                this.rooms = rooms;

                this.bookingInitialLoad();
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

        // Subscribe to filter changes
        this._masterRollService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this.filterBy = filter;
            });

        // Subscribe to calender build changes
        this._masterRollService
            .onCalendarBuildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this.triggerCalendarLoad()
            });
        
        // Subscribe to occupancy toggle changes
        this._masterRollService
            .occupancyToggleChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                if (value) this.listScrollPositionY = null;
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

        // Subscribe to room filter changes
        this._masterRollService
            .setOccupancyRoom
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this.roomSelect.patchValue(value, { emitEvent: false });
            });

        this._masterRollService
            .setRoomFilter
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this.roomSelect.patchValue(value, { emitEvent: false });
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
                if (_.isNull(value) || !this._masterRollService.isValidViewHolder(this.constructor.name) || !this._masterRollService.isValidViewHolder(this.constructor.name))
                {
                    return;    
                }

                this.triggerCalendarLoad();
            });

        this.sortSelect
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {     
                if (!this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this.resetLazyLoadOptions();

                this.children = [...this._orderByPipe.transform(
                    this.children, 
                    this.mapOfSort.find(i => i.value === value).mapValue.value + this.mapOfSort.find(i => i.value === value).mapValue.key
                )];

                this.buildCalenderView();
            });
        
        this.roomSelect
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {     
                if (_.isNull(value) || !this._masterRollService.isValidViewHolder(this.constructor.name)) return;

                this._masterRollService.setOccupancyRoom.next(value);

                setTimeout(() => this.updateScroll(), 100);
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
        //
        this.resetLazyLoadOptions();

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
     * sort child list
     *
     * @param {MouseEvent} e
     * @param {*} item
     * @returns {void}
     */
    sortList(e: MouseEvent, item: any): void
    {
        e.preventDefault();

        if (this.sortSelect.value === item.value)
        {
            return;
        }

        this.sortSelect.patchValue(item.value);
    }

    /**
     * get sort label
     *
     * @param {string} value
     * @returns {string}
     */
    getSortLabel(value: string): string
    {
        return this.mapOfSort.find(i => i.value === value).name;
    }

    /*----------------------------------------------------------------------------*/

    /**
     * select all items
     *
     * @param {boolean} value
     * @returns {void}
     */
    selectAllChildren(value: boolean): void
    {
        if (_.isEmpty(this.bookingCalendar))
        {
            return;
        }

        this.bookingCalendar.forEach((i: { selected: boolean; }) => i.selected = value);

        this.checkChildrenSelectionStatus();
    }

    /**
     * get selected children
     */
    getSelectedChildren(): any
    {
        return this.bookingCalendar.filter((i: { selected: boolean; }) => i.selected);
    }

    /**
     * check if any child is selected
     */
    hasChildSelected(): boolean
    {
        return this.getSelectedChildren().length > 0;
    }

    /**
     * check if child slots selected
     */
    checkChildrenSelectionStatus(): void
    {
        this.allChildrenChecked = this.bookingCalendar.every((i: { selected: boolean; }) => i.selected);

        this.indeterminateChildren = this.bookingCalendar.some(i => i.selected) && !this.allChildrenChecked;

        this._masterRollService.broadcastChildSelection.next(this.getSelectedChildren().map((i: { child: Child; }) => i.child));
    }

    /**
     * reset child selection
     */
    resetChildrenSelection(): void
    {
        this.allChildrenChecked = false;
        this.indeterminateChildren = false;
    }

    /*--------------------------------------------------------------------*/

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

        // get bookings
        this._masterRollService.onCalendarDateChanged.next({
            start: DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek').format('YYYY-MM-DD'),
            end: DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek').format('YYYY-MM-DD')
        });
    }

    /**
     * build calender view headers
     */
    buildCalenderViewHeaders(): any
    {
        const items: Array<{ date: string, day: string, weekSummary: { bookings: number, attended: number, absences: number, holidays: number, casual: number, missing: number, incomplete: number, capacity: number } }> = [];

        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek'));

        for (const item of dateRange)
        {
            if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
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
                // // child filter
                // if(this.filterBy && this.filterBy.child !== '0' && child.id !== this.filterBy.child)
                // {
                //     continue;
                // }

                // // room filter
                // if(this.filterBy && this.filterBy.room !== '0' && child.rooms.filter(i => i.id === this.filterBy.room).length < 1)
                // {
                //     continue;
                // }

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
                }
            }

            // room
            for (const room of ((this.filterBy && this.filterBy.room !== '0') ? this.rooms.filter(i => i.id === this.filterBy.room) : this.rooms))
            {
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
    buildCalenderView(): void
    {
        // reset lazy load
        this.resetLazyLoadOptions();

        setTimeout(() => 
        {
            // reset calendar view
            this.bookingCalendar = [];

            const dateRange = DateTimeHelper.getDateRange(
                DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek'),
                DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek'));

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
                    });
                }

                this.bookingCalendar.push({
                    child: child,
                    items: weekItem,
                    selected: false
                });
            }

            this.lazyLoadCalenderView();
        }, 100);
    }

    /**
     * progressive rendering
     */
    lazyLoadCalenderView(): void
    {
        if (_.isEmpty(this.bookingCalendar))
        {
            this.calendarViewPortContainer.createEmbeddedView(this.calendarViewPortEmpty);
        }
        else
        {
            const ITEMS_RENDERED_AT_ONCE = 10;
            const INTERVAL_IN_MS = 200;
    
            let currentIndex = 0;
    
            this.lazyInterval = interval(INTERVAL_IN_MS)
                .pipe(startWith(0))
                .subscribe(() => 
                {
                    const nextIndex = currentIndex + ITEMS_RENDERED_AT_ONCE;
    
                    for (let n = currentIndex; n < nextIndex ; n++) 
                    {
                        if (n >= this.bookingCalendar.length) 
                        {
                            if (this.lazyInterval) this.lazyInterval.unsubscribe();
    
                            this._logger.debug('booking master roll - finished lazy loading !!!', n);
    
                            this.setInnerScrollPosition();
    
                            break;
                        }

                        this.calendarViewPortContainer.createEmbeddedView(this.calendarViewPortListItem, {
                            weekItem: this.bookingCalendar[n]
                        });
                    }
    
                    currentIndex += ITEMS_RENDERED_AT_ONCE;
                });
        }
    }

    /**
     * reset progressive rendering options
     */
    resetLazyLoadOptions(): void
    {
        if (this.lazyInterval)
        {
            this.lazyInterval.unsubscribe();
        }

        if (this.calendarViewPortContainer)
        {
            this.calendarViewPortContainer.clear();
        }
    }

    /**
     * get element scroll position Y
     *
     * @param {ScrollEvent} event
     */
    getInnerScrollPosition(event: ScrollEvent): void
    {
        if (this.weekCalendarLoading)
        {
            return;
        }
        
        if (event.scrollPositionY !== 0)
        {
            this.listScrollPositionY = (event.isReachingTop || event.scrollPositionY <= 300) ? null : event.scrollPositionY;
        }
    }

    /**
     * set scroll position Y
     */
    setInnerScrollPosition(): void
    {
        if (this.directiveScroll && !_.isNull(this.listScrollPositionY))
        {
            this.directiveScroll.scrollToY(this.listScrollPositionY, 0);
        }
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

    /*--------------------------------------------------------------------*/

    /**
     * create single booking
     *
     * @param {MouseEvent} e
     * @param {BookingCalendarItem} item
     * @returns {void}
     */
    createBooking(e: MouseEvent, item: BookingCalendarItem, child: Child): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        this.weekCalendarLoading = true;

        this._bookingService
            .getDependency(BookingSessionType.BOTH, true)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.weekCalendarLoading = false, 0))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response) || _.isEmpty(response.fees)) 
                    { 
                        // this._bookingService.disableBookingActions.next(true);

                        setTimeout(() =>
                        {
                            this._notification.displayNotification(
                                'Warning',
                                'Fees not available! Please set up fees in settings',
                                NotifyMessageType.WARNING,
                                5000
                            );
                        }, 50);
                        
                        return; 
                    }

                    this.fees = [...response.fees];
                    this.rooms = [...response.rooms];
                    this.absenceReasons = {...response.abs_reason};

                    setTimeout(() => 
                    {
                        this.dialogRef = this._matDialog
                            .open(ChildAddEditSingleBookingComponent,
                            {
                                panelClass: 'child-add-edit-single-booking',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.NEW,
                                    child: child,
                                    fees: this.fees.filter((i: Fee) => i.isCasual() && !i.isArchived()),
                                    abs_reason: this.absenceReasons,
                                    calendar_date: item.date,
                                    response: {}
                                }
                            });
                            
                        this.dialogRef
                            .afterClosed()
                            .pipe(takeUntil(this._unsubscribeAll))
                            .subscribe(message =>
                            {   
                                if ( !message )
                                {
                                    return;
                                }
    
                                this.triggerCalendarLoad();
    
                                this._notification.clearSnackBar();
    
                                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                            });
                    }, 100);
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * edit single booking
     *
     * @param {MouseEvent} e
     * @param {BookingCalendarItem} item
     * @param {Booking} slot
     * @returns {void}
     */
    editSlot(e: MouseEvent, item: BookingCalendarItem, slot: Booking, child: Child): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        this.weekCalendarLoading = true;

        forkJoin([
            this._bookingService.getDependency(BookingSessionType.BOTH, true, slot.fee.id),
            this._bookingService.getBooking(slot.id)
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.weekCalendarLoading = false, 0))
            )
            .subscribe(
                ([response, bookingSlot]) =>
                {
                    if (_.isEmpty(response) || _.isEmpty(response.fees)) 
                    { 
                        // this._bookingService.disableBookingActions.next(true);

                        setTimeout(() =>
                        {
                            this._notification.displayNotification(
                                'Warning',
                                'Fees not available! Please set up fees in settings',
                                NotifyMessageType.WARNING,
                                5000
                            );
                        }, 50);
                        
                        return; 
                    }

                    this.fees = [...response.fees];
                    this.rooms = [...response.rooms];
                    this.absenceReasons = {...response.abs_reason};

                    setTimeout(() => 
                    {
                        this.dialogRef = this._matDialog
                            .open(ChildAddEditSingleBookingComponent,
                            {
                                panelClass: 'child-add-edit-single-booking',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.EDIT,
                                    child: child,
                                    fees: this.fees.filter((i: Fee) => slot.isCasual ? i.isCasual() : !i.isCasual()),
                                    abs_reason: this.absenceReasons,
                                    calendar_date: item.date,
                                    response: bookingSlot
                                }
                            });
    
                        this.dialogRef
                            .afterClosed()
                            .pipe(takeUntil(this._unsubscribeAll))
                            .subscribe(message =>
                            {   
                                if ( !message )
                                {
                                    return;
                                }
    
                                this.triggerCalendarLoad();
    
                                this._notification.clearSnackBar();
    
                                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                            });
                    }, 100);
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * open child profile in new tab
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    openChildProfile(e: MouseEvent, id: string): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        this._navService.goToChildProfileNewTab(id);
    }

    /**
     * get child image
     *
     * @param {*} item
     * @returns {string}
     */
    getChildProfileImage(item: any) : string
    {
        return (item.image) 
            ? this._commonService.getS3FullLinkforProfileImage(item.image) 
            : `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }
}

import { Component, OnInit, ViewEncapsulation, OnDestroy, Input, Output, EventEmitter, ViewContainerRef, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { takeUntil, finalize, startWith } from 'rxjs/operators';
import { Subject, forkJoin, interval } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';

import { AuthService } from 'app/shared/service/auth.service';
import { ChildBookingService } from 'app/main/modules/child/booking/services/booking.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NavigationService } from 'app/shared/service/navigation.service';
import { BookingMasterRollCoreService } from '../../services/booking-core.service';

import { Booking } from 'app/main/modules/child/booking/booking.model';
import { Child } from 'app/main/modules/child/child.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { BookingSessionType } from 'app/shared/enum/booking-session-type.enum';
import { AuthClient } from 'app/shared/model/authClient';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import { ChildAddEditSingleBookingComponent } from 'app/main/modules/modules-shared/booking/dialogs/add-edit-single-booking/add-edit-single-booking.component';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { DateTimeHelper } from 'app/utils/date-time.helper';

import { BookingMasterRollLisViewItem } from '../calendar-week-list-view.component';

export interface TabViewBookingSummary {
    totalChildren: number;
    totalSessions: number;
    totalFees: number;
    totalHours: number;
    totalCapacity: number;
}

@Component({
    selector: 'booking-master-roll-calendar-week-list-tab-view',
    templateUrl: './tab-view.component.html',
    styleUrls: ['./tab-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingMasterRollCalendarWeekListTabViewComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    weekCalendarLoading: boolean;

    allChildrenChecked: boolean;
    indeterminateChildren: boolean;

    fees: Fee[];
    rooms: Room[];
    absenceReasons: any;
    client: AuthClient;

    dialogRef: any;

    lazyInterval: any;

    @ViewChild('ViewPortContainer', { read: ViewContainerRef })
    ViewPortContainer: ViewContainerRef;

    @ViewChild('calendarViewPortContainer', { read: ViewContainerRef })
    calendarViewPortContainer: ViewContainerRef;

    @ViewChild('listViewItem', { read: TemplateRef }) 
    calendarViewPortListItem: TemplateRef<any>;

    @ViewChild('emptyBlock', { read: TemplateRef }) 
    calendarViewPortEmpty: TemplateRef<any>;

    @Input() bookingItem: BookingMasterRollLisViewItem;

    @Input() date: string;

    @Input() hideBookingInfo: boolean;

    @Input() filterBy: any | null = null;

    @Output()
    fetchBookings: EventEmitter<boolean>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     * @param {ChildBookingService} _bookingService
     * @param {BookingMasterRollCoreService} _masterRollService
     * @param {BookingMasterRollListViewService} _masterRollServiceListView
     * @param {MatDialog} _matDialog
     * @param {NotificationService} _notification
     * @param {NavigationService} _navService
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _bookingService: ChildBookingService,
        private _masterRollService: BookingMasterRollCoreService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _navService: NavigationService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.rooms = [];
        this.fees = [];
        this.weekCalendarLoading = false;
        this.allChildrenChecked = false;
        this.indeterminateChildren = false;

        this.lazyInterval = null;

        this.fetchBookings = new EventEmitter();

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
        this._logger.debug('master roll list view tab !!!', this.bookingItem.items);

        // Subscribe to view loader changes
        this._masterRollService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.weekCalendarLoading = value);

        // Subscribe to fee changes
        this._masterRollService
            .onFeeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((fees: Fee[]) => this.fees = fees);

        // Subscribe to room changes
        this._masterRollService
            .onRoomsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: Room[]) => this.rooms = rooms);
    }

    /**
     * On After view init
     */
    ngAfterViewInit(): void 
    {
        setTimeout(() => this.lazyLoadCalenderView(), 0);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.resetChildrenSelection();

        // reset selection
        this.bookingItem.items.forEach(i => 
        {
            i.selected = false;

            return i;
        });

        this.fetchBookings.unsubscribe();

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
     * select all items
     *
     * @param {boolean} value
     * @returns {void}
     */
    selectAllChildren(value: boolean): void
    {
        if (_.isEmpty(this.bookingItem.items))
        {
            return;
        }

        this.bookingItem.items.forEach((i: { selected: boolean; }) => i.selected = value);

        this.checkChildrenSelectionStatus();
    }

    /**
     * get selected children
     */
    getSelectedChildren(): any
    {
        return this.bookingItem.items.filter((i: { selected: boolean; }) => i.selected);
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
        this.allChildrenChecked = this.bookingItem.items.every((i: { selected: boolean; }) => i.selected);

        this.indeterminateChildren = this.bookingItem.items.some(i => i.selected) && !this.allChildrenChecked;

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

    /**
     * get room information
     *
     * @param {string} id
     * @returns {Room}
     */
    getRoomInfo(id: string): Room
    {
        return this.rooms.find(i => i.id === id);
    }

    /**
     * get current date booking summary
     *
     * @readonly
     * @type {TabViewBookingSummary}
     */
    get summaryReport(): TabViewBookingSummary
    {
        if(!this.bookingItem)
        {
            return null;
        }

        const list: Booking[] = [].concat.apply([], this.bookingItem.items.map(i => i.booking));

        return {
            totalChildren: Object.keys(_.groupBy(list, 'child.id')).length,
            totalFees: _.sumBy(list, i => i.fee.hasSession() ? parseFloat(i.price) : i.getHourlySessionHours() * parseFloat(i.price)),
            totalHours: _.sumBy(list, i => i.fee.getSessionHours()),
            totalSessions: list.length,
            totalCapacity: this.bookingItem.capacity
        }
    }

    /**
     * get attendance summary
     *
     * @readonly
     * @type {{ bookings: number, absences: number, holidays: number, in: number, out: number, unknown: number }}
     */
    get attendanceSummaryReport(): { bookings: number, absences: number, holidays: number, casual: number, in: number, out: number, unknown: number }
    {
        if(!this.bookingItem)
        {
            return null;
        }

        const list: Booking[] = [].concat.apply([], this.bookingItem.items.map(i => i.booking));

        const children: Child[] = _.uniqBy(list.map(i => i.child), 'id');
        
        let weekTotalBookings = 0;
        let weekTotalAbsence = 0;
        let weekTotalHoliday = 0;
        let weekTotalCasual = 0;
        let weekTotalAttendedIn = 0;
        let weekTotalAttendedOut = 0;
        let weekTotalUnknown = 0;

        for (const child of children)
        {
            const bookings = list.filter(i => i.child.id === child.id && i.date === DateTimeHelper.getUtcDate(this.bookingItem.date));

            if (bookings.length > 0)
            {
                weekTotalBookings += (bookings.length);
                weekTotalAbsence += (bookings.filter(i => i.isAbsent()).length);
                weekTotalHoliday += (bookings.filter(i => i.isHoliday()).length);
                weekTotalCasual += (bookings.filter(i => i.isCasual).length);
                weekTotalAttendedIn += (bookings.filter(i => !i.isAbsent() && (i.attendance && !i.attendance.checkOutTime)).length);
                weekTotalAttendedOut += (bookings.filter(i => !i.isAbsent() && (i.attendance && i.attendance.isCompleted())).length);
                weekTotalUnknown += (bookings.filter(i => !i.isHoliday() && !i.isAbsent() && !i.attendance).length);
            }
        }

        return {
            bookings: weekTotalBookings,
            absences: weekTotalAbsence,
            holidays: weekTotalHoliday,
            in: weekTotalAttendedIn,
            out: weekTotalAttendedOut,
            unknown: weekTotalUnknown,
            casual: weekTotalCasual
        }
    }

    /**
     * create single booking
     *
     * @param {MouseEvent} e
     * @param {BookingMasterRollLisViewItem} item
     * @returns {void}
     */
    createBooking(e: MouseEvent, item: BookingMasterRollLisViewItem, child: Child): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        this._masterRollService.onViewLoaderChanged.next(true);

        this._bookingService
            .getDependency(BookingSessionType.BOTH, true)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this._masterRollService.onViewLoaderChanged.next(false), 0))
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
    
                                this.fetchBookings.next(true);
    
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
     * @param {BookingMasterRollLisViewItem} item
     * @param {Booking} slot
     * @param {Child} child
     * @returns {void}
     */
    editSlot(e: MouseEvent, item: BookingMasterRollLisViewItem, slot: Booking, child: Child): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        this._masterRollService.onViewLoaderChanged.next(true);

        forkJoin([
            this._bookingService.getDependency(BookingSessionType.BOTH, true, slot.fee.id),
            this._bookingService.getBooking(slot.id)
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this._masterRollService.onViewLoaderChanged.next(false), 0))
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
    
                                this.fetchBookings.next(true);
    
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

    /*--------------------------------------------------------------------*/

    /**
     * progressive rendering
     */
    lazyLoadCalenderView(): void
    {
        if (_.isEmpty(this.bookingItem.items))
        {
            this.ViewPortContainer.createEmbeddedView(this.calendarViewPortEmpty);
        }
        else
        {
            const ITEMS_RENDERED_AT_ONCE = 10;
            const INTERVAL_IN_MS = 100;
    
            let currentIndex = 0;
    
            this.lazyInterval = interval(INTERVAL_IN_MS)
                .pipe(startWith(0))
                .subscribe(() => 
                {
                    const nextIndex = currentIndex + ITEMS_RENDERED_AT_ONCE;
    
                    for (let n = currentIndex; n < nextIndex ; n++) 
                    {
                        if (n >= this.bookingItem.items.length) 
                        {
                            if (this.lazyInterval) this.lazyInterval.unsubscribe();
    
                            this._logger.debug('booking master roll - finished lazy loading !!!', n);
    
                            // this.setInnerScrollPosition();
    
                            break;
                        }
    
                        this.calendarViewPortContainer.createEmbeddedView(this.calendarViewPortListItem, {
                            row: this.bookingItem.items[n]
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
        if (this.calendarViewPortContainer)
        {
            this.calendarViewPortContainer.clear();
        }

        if (this.lazyInterval)
        {
            this.lazyInterval.unsubscribe();
        }
    }
}

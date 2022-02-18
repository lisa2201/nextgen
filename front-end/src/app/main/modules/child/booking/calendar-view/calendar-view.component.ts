import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { DOCUMENT, CurrencyPipe } from '@angular/common';
import { FormControl } from '@angular/forms';
import { takeUntil, finalize, distinctUntilChanged, startWith, skip } from 'rxjs/operators';
import { Subject, Observable, forkJoin } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';

import { ChildBookingService } from '../services/booking.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';

import { Booking } from '../booking.model';
import { AuthClient } from 'app/shared/model/authClient';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Child } from '../../child.model';

import { BookingSummary } from '../booking.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { BookingSessionType } from 'app/shared/enum/booking-session-type.enum';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Room } from 'app/main/modules/room/models/room.model';

import { ChildAddEditSingleBookingComponent } from 'app/main/modules/modules-shared/booking/dialogs/add-edit-single-booking/add-edit-single-booking.component';
import {CommonService} from '../../../../../shared/service/common.service';

export interface BookingCalendarItem {
    id: string;
    date: Date;
    day_number: string;
    day_name: string;
    day_month: string;
    week_end: boolean;
    current_month: boolean;
    booking: Booking[];
}

@Component({
    selector: 'booking-calendar-view',
    templateUrl: './calendar-view.component.html',
    styleUrls: ['./calendar-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        CurrencyPipe
    ],
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingCalendarViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    calendarDate: FormControl;
    
    child: Child;
    fees: Fee[];
    rooms: Room[];
    absenceReasons: any;
    bookingCalendar: BookingCalendarItem[];
    bookings: Booking[];

    calendarLoading: boolean;
    hideWeekEnd: boolean;
    buttonLoader: boolean;
    dialogRef: any;
    
    client: AuthClient;

    disableBookingActions: boolean;
    showFilters: boolean;
    filterBy: any | null = null;

    @Input() isCreateButtonLoading: boolean;

    @ViewChild('monthView')
    monthCalenderInput: ElementRef;

    @Output()
    updateBookingSummary: EventEmitter<BookingSummary>;

    /**
     * Constructor
     *
     * @param {*} _document
     * @param {NGXLogger} _logger
     * @param {ChildBookingService} _bookingService
     * @param {AuthService} _authService
     * @param {MatDialog} _matDialog
     * @param {NotificationService} _notification
     * @param _currencyPipe
     * @param _commonService
     * @param _currencyPipe
     */
    constructor(
        @Inject(DOCUMENT) private _document: any,
        private _logger: NGXLogger,
        private _bookingService: ChildBookingService,
        private _authService: AuthService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _currencyPipe: CurrencyPipe,
        private _commonService: CommonService,
    )
    {
        // set default values
        this.calendarLoading = false;
        this.client = this._authService.getClient();
        this.showFilters = false;
        this.hideWeekEnd = false; // this._bookingService.calenderSettings.hideWeekEnd;
        this.disableBookingActions = false;
        
        this.updateBookingSummary = new EventEmitter();

        this.calendarDate = new FormControl(DateTimeHelper.now().toDate());

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
        this._logger.debug('booking calendar view !!!');

        // Subscribe to child changes
        this._bookingService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((booking: any) => 
            {
                this._logger.debug('[child booking - calendar view]', booking);

                this.child = booking;
            });

        // Subscribe to booking changes
        this._bookingService
            .onChildBookingChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[child booking]', response);

                this.bookings = response;

                this.updateBookingSummary.emit(this.bookingSummary);

                setTimeout(() => this.buildCalenderView(), 250);
            });

        // Subscribe to room changes
        this._bookingService
            .onFilterRoomChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => this.rooms = response);

        // Subscribe to fee list changes
        this._bookingService
            .onFilterFeeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => this.fees = response);

        // Subscribe to absence reasons changes
        this._bookingService
            .onFilterAbsenceReasonChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => this.absenceReasons = response);
        
        // Subscribe to view loader changes
        this._bookingService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.calendarLoading = value);
        
        // Subscribe to form value changes
        this.calendarDate
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                startWith(this.calendarDate.value),
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
        
        // Subscribe to filter changes
        this._bookingService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => this.filterBy = filter);

        // Subscribe to action blocker changes
        this._bookingService
            .disableBookingActions
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.disableBookingActions = value);
        
        // Subscribe to calendar date updates
        /*this._bookingService
            .onUpdateCalendarDateChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                const index = this.bookingCalendar.findIndex(i => i.id === value.selected.id);

                if (index > -1)
                {                    
                    if (value.action === AppConst.modalActionTypes.NEW)
                    {
                        this.bookingCalendar[index].booking = this.bookingCalendar[index].booking
                            .concat(value.booking)
                            .map((v, i) =>
                            {
                                v.index = i;
                                return v;
                            });
                    }
                    else if (value.action === AppConst.modalActionTypes.EDIT)
                    {
                        const bookingIndex = this.bookingCalendar[index].booking.findIndex(i => i.id === value.booking.id);

                        if (bookingIndex > -1)
                        {
                            this.bookingCalendar[index].booking[bookingIndex] = value.booking;
                        }
                    }
                    else
                    {
                        const booking: Booking = this.bookingCalendar[index].booking.find(i => i.id === value.booking.id);

                        if (booking)
                        {
                            this.bookingCalendar[index].booking = this.bookingCalendar[index].booking
                                .filter((i) => i.id !== booking.id)
                                .map((v, i) =>
                                {
                                    v.index = i;
                                    return v;
                                });
                        }
                    }
                }
            });*/
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.updateBookingSummary.unsubscribe();
        
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

        if (this.calendarLoading || this.isCreateButtonLoading || this.disableBookingActions)
        {
            return;
        }

        (<HTMLElement> (<HTMLElement> this.monthCalenderInput.nativeElement).querySelector('.ant-picker-input')).click();
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

        if (this.calendarLoading || this.isCreateButtonLoading || this.disableBookingActions)
        {
            return;
        }

        this.calendarDate.patchValue(DateTimeHelper.parseMoment(this.calendarDate.value).add(1, 'M').toDate());
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

        if (this.calendarLoading || this.isCreateButtonLoading || this.disableBookingActions)
        {
            return;
        }

        this.calendarDate.patchValue(DateTimeHelper.parseMoment(this.calendarDate.value).subtract(1, 'M').toDate());
    }
    
    /**
     * get calendar label
     *
     * @returns {string}
     */
    getCalendarTitle(): string
    {
        return DateTimeHelper.parseMoment(this.calendarDate.value).format('MMMM YYYY');
    }

    /**
     * load calendar dates
     *
     * @returns {void}
     */
    triggerCalendarLoad(): void
    {
        if (this.calendarLoading || this.isCreateButtonLoading || this.disableBookingActions)
        {
            return;
        }
        
        this._bookingService.onCalendarDateChanged.next({
            start: DateTimeHelper.parseMoment(this.calendarDate.value).startOf('month').startOf('isoWeek').format('YYYY-MM-DD'),
            end: DateTimeHelper.parseMoment(this.calendarDate.value).endOf('month').endOf('isoWeek').format('YYYY-MM-DD')
        });
    }

    /**
     * build calender layout
     */
    buildCalenderView(): void
    {
        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.calendarDate.value).startOf('month').startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.calendarDate.value).endOf('month').endOf('isoWeek'));

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
                    
                this.bookingCalendar.push({
                    id: uuid.v4(),
                    date: item.toDate(),
                    day_number: item.format('DD'),
                    day_name: _.capitalize(item.format('ddd')),
                    day_month: _.capitalize(item.format('MMM')),
                    week_end: item.day() === 6 || item.day() === 0,
                    current_month: DateTimeHelper.parseMoment(this.calendarDate.value).startOf('month').format('MM') === item.clone().startOf('month').format('MM'),
                    booking: _.sortBy(this.bookings.filter(i => i.date === item.format('YYYY-MM-DD')), slot => slot.sessionStart)
                });
            }
        });
    }

    /**
     * create single booking
     *
     * @param {MouseEvent} e
     * @param {BookingCalendarItem} item
     * @returns {void}
     */
    createBooking(e: MouseEvent, item: BookingCalendarItem): void
    {
        e.preventDefault();

        if (this.calendarLoading || this.isCreateButtonLoading || this.disableBookingActions)
        {
            return;
        }

        this.calendarLoading = true;

        this._bookingService
            .getDependency(BookingSessionType.BOTH, true)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.calendarLoading = false, 0))
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
                                    child: this.child,
                                    fees: this.fees.filter((i: Fee) => i.isCasual() && !i.isArchived()),
                                    rooms: this.rooms,
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
    editSlot(e: MouseEvent, item: BookingCalendarItem, slot: Booking): void
    {
        e.preventDefault();

        if (this.calendarLoading || this.isCreateButtonLoading || this.disableBookingActions)
        {
            return;
        }

        this.calendarLoading = true;

        forkJoin([
            this._bookingService.getDependency(BookingSessionType.BOTH, true, slot.fee.id),
            this._bookingService.getBooking(slot.id)
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.calendarLoading = false, 0))
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
                                    child: this.child,
                                    fees: this.fees.filter((i: Fee) => slot.isCasual ? i.isCasual() : !i.isCasual()),
                                    rooms: this.rooms,
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
     * get current months booking summary
     *
     * @returns {BookingSummary}
     */
    get bookingSummary(): BookingSummary
    {
        if(!this.bookings)
        {
            return null;
        }

        let _totalSessions = 0;
        let _totalHours = 0;
        let _totalFees = 0;

        for (const item of this.bookings)
        {
            if (DateTimeHelper.parseMoment(this.calendarDate.value).startOf('month').format('MM') === DateTimeHelper.parseMoment(item.date).startOf('month').format('MM'))
            {
                _totalSessions += 1;
                _totalHours += item.fee.getSessionHours();
                _totalFees += item.fee.hasSession() ? parseFloat(item.price) : item.getHourlySessionHours() * parseFloat(item.price);
            }
        }

        return {
            totalSessions: _totalSessions,
            totalHours: _totalHours,
            totalFees: this._currencyPipe.transform(_totalFees, this.client.currency, 'symbol', '1.2-2')
        };
    }

    getChildProfileImage(item: any) : string
    {
        if(item.image)
        {
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        }
        else
        {
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
        }
    }
}

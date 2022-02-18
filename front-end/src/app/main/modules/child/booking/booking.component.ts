import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { ChildBookingService } from './services/booking.service';
import { ChildrenService } from '../services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Child } from '../child.model';
import { AppConst } from 'app/shared/AppConst';

import { browserRefresh } from 'app/app.component';

import { Fee } from '../../centre-settings/fees/model/fee.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { BookingSessionType } from 'app/shared/enum/booking-session-type.enum';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import { Room } from '../../room/models/room.model';

import { ChildAddBookingComponent } from './dialogs/add-bookings/add-bookings.component';
import { BookingCalendarViewComponent } from './calendar-view/calendar-view.component';
import { ChildManageBulkBookingsComponent } from './dialogs/manage-bulk-bookings/manage-bulk-bookings.component';
import { ChildCalenderFiltersComponent } from './sidenavs/right/calender-filters/calender-filters.component';
import { BatchUpdateAttendanceComponent } from '../../modules-shared/attendance/dialogs/batch-update-attendance/batch-update-attendance.component';

export interface BookingSummary
{
    totalSessions: number;    
    totalHours: number;    
    totalFees: string;
}

@Component({
    selector: 'child-booking',
    templateUrl: './booking.component.html',
    styleUrls: ['./booking.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildBookingComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    fees: Fee[];
    rooms: Room[];
    absenceReasons: any;
    
    buttonLoader: boolean;
    viewHelpPanel: boolean;
    dialogRef: any;

    bookingTypes: typeof AppConst.bookingTypes;
    bookingSummary: BookingSummary;

    disableBookingActions: boolean;

    @ViewChild(BookingCalendarViewComponent)
    calendarComponent: BookingCalendarViewComponent;

    @ViewChild(ChildCalenderFiltersComponent)
    filterComponent: ChildCalenderFiltersComponent;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildBookingService} _bookingService
     * @param {MatDialog} _matDialog
     * @param {ChildrenService} _childrenServices
     * @param {NotificationService} _notification
     */
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _bookingService: ChildBookingService,
        private _matDialog: MatDialog,
        private _childrenServices: ChildrenService,
        private _fuseSidebarService: FuseSidebarService,
        private _notification: NotificationService,
    )
    {
        // set default values
        this.buttonLoader = false;
        this.viewHelpPanel = true;
        this.bookingTypes = AppConst.bookingTypes;
        this.disableBookingActions = false;

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
        this._logger.debug('child booking !!!');

        // Subscribe to child enrolment changes
        this._bookingService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) => 
            {
                this._logger.debug('[child booking]', child);

                this.child = child;

                if (browserRefresh)
                {
                    this._childrenServices.setDefaultCurrentChild(this.child);
                }
            });
        
        // Subscribe to action blocker changes
        this._bookingService
            .disableBookingActions
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.disableBookingActions = value);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        // reset service
        this._bookingService.unsubscribeOptions();

        // reset child service
        if (this._router.routerState.snapshot.url.indexOf('/manage-children') < 0)
        {
            this._childrenServices.unsubscribeOptions();
        }
        
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
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    /**
     * check calendar loader
     *
     * @readonly
     * @type {boolean}
     */
    get calendarLoading(): boolean
    {
        return (typeof this.calendarComponent !== 'undefined') ? this.calendarComponent.calendarLoading : false;
    }

    /**
     * check if calender filter form changed
     *
     * @readonly
     * @type {boolean}
     */
    get filterFormChanged(): boolean
    {
        return (typeof this.filterComponent !== 'undefined') ? this.filterComponent.showFilterButton : false;
    }

    /**
     * clear filters
     *
     * @param {MouseEvent} e
     */
    clearFilter(e: MouseEvent): void
    {
        if (this.calendarComponent.calendarLoading || this.buttonLoader)
        {
            return;    
        }
        
        this.filterComponent.clearFilter(e);
    }

    /**
     * refresh calendar dates
     *
     * @param {MouseEvent} e
     */
    refreshCalendar(e: MouseEvent): void
    {
        e.preventDefault();

        this.calendarComponent.triggerCalendarLoad();
    }

    /**
     * toggle sidebar
     *
     * @param {MouseEvent} e
     */
    toggleSidebar(name: string): void
    {
        if (this.calendarComponent.calendarLoading || this.buttonLoader)
        {
            return;    
        }

        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * display help information
     *
     * @param {MouseEvent} e
     */
    showHelpPanel(e: MouseEvent): void
    {
        e.preventDefault();

        this.viewHelpPanel = !this.viewHelpPanel;
    }

    /**
     * get booking summary from calendar component
     *
     * @param {BookingSummary} data
     */
    getBookingSummaryUpdates(data: BookingSummary): void
    {
        this.bookingSummary = data;
    }

    /**
     * open create booking dialog
     *
     * @param {MouseEvent} e
     */
    createBooking(e: MouseEvent): void
    {
        e.preventDefault();

        if(this.disableBookingActions)
        {
            return;
        }

        this.buttonLoader = true;

        this._bookingService
            .getDependency(BookingSessionType.BOTH)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
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

                    this.rooms = [...response.rooms];
                    this.fees = [...response.fees];
                    
                    this.dialogRef = this._matDialog
                        .open(ChildAddBookingComponent,
                        {
                            panelClass: 'child-add-booking',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                child: this.child,
                                fees: this.fees.filter((i: Fee) => !i.isArchived()),
                                rooms: this.rooms,
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

                            this.calendarComponent.triggerCalendarLoad();
            
                            this._notification.clearSnackBar();
            
                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * manage bookings [edit/delete]
     *
     * @param {MouseEvent} e
     */
    manageBookings(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.calendarComponent.calendarLoading || this.buttonLoader)
        {
            return;    
        }

        this.calendarComponent.calendarLoading = true;

        this._bookingService
            .getDependency(BookingSessionType.BOTH, true)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.calendarComponent.calendarLoading = false, 200))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response) || _.isEmpty(response.fees)) 
                    { 
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

                    this.rooms = [...response.rooms];
                    this.fees = [...response.fees];
                    this.absenceReasons = {...response.abs_reason};

                    this.dialogRef = this._matDialog
                        .open(ChildManageBulkBookingsComponent,
                        {
                            panelClass: 'child-manage-bulk-booking',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                child: this.child,
                                fees: this.fees,
                                rooms: this.rooms,
                                abs_reason: this.absenceReasons,
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
            
                            this.calendarComponent.triggerCalendarLoad();
            
                            this._notification.clearSnackBar();
            
                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * update bulk attendance
     *
     * @param {MouseEvent} e
     */
    updateBatchAttendance(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.calendarComponent.calendarLoading || this.buttonLoader)
        {
            return;    
        }
        
        this.dialogRef = this._matDialog
            .open(BatchUpdateAttendanceComponent,
            {
                panelClass: 'batch-update-attendance',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    children: [this.child],
                    rooms: this.child.rooms,
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

                this.calendarComponent.triggerCalendarLoad();
            
                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    }
}

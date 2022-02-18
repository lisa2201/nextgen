import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntil, finalize, filter, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzModalService } from 'ng-zorro-antd/modal';

import { ChildBookingService } from '../child/booking/services/booking.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { AuthService } from 'app/shared/service/auth.service';
import { BookingMasterRollCoreService } from './services/booking-core.service';

import { Booking } from '../child/booking/booking.model';
import { Child } from '../child/child.model';
import { Fee } from '../centre-settings/fees/model/fee.model';
import { Room } from '../room/models/room.model';
import { AuthClient } from 'app/shared/model/authClient';
import { BookingSessionType } from 'app/shared/enum/booking-session-type.enum';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import { DateTimeHelper } from 'app/utils/date-time.helper';

import { ManageMasterRollBookingsComponent } from './dialogs/manage-master-roll-bookings/manage-master-roll-bookings.component';
import { AddMasterRollBookingsComponent } from './dialogs/add-master-roll-bookings/add-master-roll-bookings.component';
import { ChildrenAttendanceReportComponent } from '../modules-shared/attendance/dialogs/attendance-report/attendance-report.component';
import { MasterRollTimeSheetComponent } from './modals/master-roll-time-sheet/master-roll-time-sheet.component';
import { BatchUpdateAttendanceComponent } from '../modules-shared/attendance/dialogs/batch-update-attendance/batch-update-attendance.component';
import { FuseInnerScrollDirective } from '@fuse/directives/fuse-inner-scroll/fuse-inner-scroll.directive';

export interface MasterRollSummary {
    totalChildren: number;
    totalSessions: number;
    totalFees: number;
    totalHours: number;
}

@Component({
    selector: 'booking-master-roll',
    templateUrl: './booking-master-roll.component.html',
    styleUrls: ['./booking-master-roll.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingMasterRollComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    bookings: Booking[];
    selectedChildren: Child[];
    children: Child[];
    fees: Fee[];
    rooms: Room[];
    client: AuthClient;

    weekCalendarLoading: boolean;
    buttonLoader: boolean;
    dialogRef: any;
    bookingListView: boolean;
    
    masterViewLinks: Array<string> = [
        'manage-master-roll/calendar-view',
        'manage-master-roll/list-view'
    ];

    viewHelpPanel: boolean;
    bookingTypes: typeof AppConst.bookingTypes;
    hideWeekEnd: boolean;

    filterBy: any | null;

    timeSheetModal: NzModalRef;

    OccupancyList: Array<{ 
        room: Room,
        summary: Array<{
            date: string, 
            day: string, 
            weekSummary: { bookings: number, capacity: number, percent: number } 
        }>
    }>;
    toggleOccupancyView: boolean;
    occupancyButtonLoader: boolean;

    @ViewChild(FuseInnerScrollDirective)
    directiveInnerScroll: FuseInnerScrollDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {MatDialog} _matDialog
     * @param {BookingMasterRollCoreService} _masterRollService
     * @param {ChildBookingService} _bookingService
     * @param {NotificationService} _notification
     * @param {AuthService} _authService
     * @param {NzModalService} _modalService
     * @param {Router} _router
     */
    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _masterRollService: BookingMasterRollCoreService,
        private _bookingService: ChildBookingService,
        private _notification: NotificationService,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _router: Router
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.bookings = [];
        this.fees = [];
        this.rooms = [];
        this.children = [];
        this.selectedChildren = [];
        this.weekCalendarLoading = false;
        this.buttonLoader = false;
        this.bookingListView = (_.indexOf(this.masterViewLinks, _.join(_.drop(this._router.url.split('/')), '/')) === 1);
        this.viewHelpPanel = false;
        this.bookingTypes = AppConst.bookingTypes;
        this.hideWeekEnd = this._masterRollService.calenderSettings.hideWeekEnd;
        this.filterBy = null;
        this.OccupancyList = [];
        this.toggleOccupancyView = false;

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
        this._logger.debug('booking master roll view !!!', this.selectedChildren.length);

        // Subscribe to booking changes
        this._masterRollService
            .onChildrenBookingChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((bookings: Booking[]) => 
            {
                this._logger.debug('[booking master roll view - bookings]', bookings);

                this.bookings = bookings;
            });

        // Subscribe to children changes
        this._masterRollService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((children: Child[]) => 
            {
                this._logger.debug('[booking master roll view - children]', children);

                this.children = children;
            });

        // Subscribe to fee changes
        this._masterRollService
            .onFeeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((fees: Fee[]) => 
            {
                this._logger.debug('[booking master roll view - fees]', fees);

                this.fees = fees;
            });

        // Subscribe to rooms changes
        this._masterRollService
            .onRoomsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rooms: Room[]) => 
            {
                this._logger.debug('[booking master roll view - rooms]', rooms);

                this.rooms = rooms;
            });

        // Subscribe to view loader changes
        this._masterRollService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.weekCalendarLoading = value);

        // Subscribe to filter changes
        this._masterRollService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this._logger.debug('[booking master roll view - filter]', value);

                this.filterBy = value;
            });

        // Subscribe to reset base filter option
        this._masterRollService
            .resetBaseFilterOptions
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.filterBy = value);

        // Subscribe to booking occupancy changes
        this._masterRollService
            .triggerOccupancyBookingDateChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.getOccupancyBooking());

        // Subscribe to view loader changes
        this._masterRollService
            .broadcastChildSelection
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((children: Child[]) => this.selectedChildren = children);

        // Subscribe to route changes
        this._router
            .events
            .pipe(
                filter((event: any) => event instanceof NavigationEnd),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(() => this.bookingListView = (_.indexOf(this.masterViewLinks, _.join(_.drop(this._router.url.split('/')), '/')) === 1));

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.timeSheetModal)
        {
            this.timeSheetModal.close()
        }

        // Close all dialogs
        this._matDialog.closeAll();

        // reset service
        this._masterRollService.unsubscribeOptions();

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
     * any children selected
     *
     * @readonly
     * @type {boolean}
     */
    get hasChildrenSelected(): boolean
    {
        return this.selectedChildren.length > 0;
    }

    /**
     * toggle between calendar views
     */
    toggleCalenderView(value: boolean): void
    {
        this.bookingListView = value;

        // reset selected child list 
        this.selectedChildren = [];

        this._router.navigate([this.bookingListView ? _.last(this.masterViewLinks) : _.head(this.masterViewLinks)]);
    }

    /**
     * get current week booking summary
     *
     * @returns {MasterRollSummary}
     */
    get summaryReport(): MasterRollSummary
    {
        if(!this.bookings)
        {
            return null;
        }

        return {
            // totalChildren: Object.keys(_.groupBy(this.bookings, 'child.id')).length,
            totalChildren: this.getChildrenCount(),
            totalFees: _.sumBy(this.bookings, i => i.fee.hasSession() ? parseFloat(i.price) : i.getHourlySessionHours() * parseFloat(i.price)),
            totalHours: _.sumBy(this.bookings, i => i.fee.getSessionHours()),
            totalSessions: this.bookings.length
        }
    }

    /**
     * get child rent count
     */
    getChildrenCount(): number
    {
        return this.children.filter(child => 
        {
            // child filter
            if (this.filterBy && this.filterBy.child !== '0' && child.id !== this.filterBy.child)
            {
                return false;
            }
    
            // room filter
            if (this.filterBy && this.filterBy.room !== '0' && child.rooms.filter(i => i.id === this.filterBy.room).length < 1)
            {
                return false;
            }

            return true;
        })
        .length;
    }

    /*---------------------------------------------------------*/

    /**
     * open create bookings dialog
     *
     * @param {MouseEvent} e
     */
    addBooking(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading || this.buttonLoader || this.selectedChildren.length === 0 || this.occupancyButtonLoader)
        {
            return;    
        }

        this.weekCalendarLoading = this.buttonLoader = true;

        this._bookingService
            .getDependency(BookingSessionType.BOTH)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.weekCalendarLoading = this.buttonLoader = false, 200))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response)) 
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
                        .open(AddMasterRollBookingsComponent,
                        {
                            panelClass: 'add-master-roll-bookings',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                children: this.selectedChildren,
                                fees: this.fees.filter(i => !i.isArchived()),
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

                            this._masterRollService.onCalendarBuildChanged.next(null);
            
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
    manageBooking(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading || this.buttonLoader || this.selectedChildren.length === 0 || this.occupancyButtonLoader)
        {
            return;    
        }
        
        this.weekCalendarLoading = this.buttonLoader = true;

        this._bookingService
            .getDependency(BookingSessionType.BOTH, true)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.weekCalendarLoading = this.buttonLoader = false, 200))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response)) { return; }

                    this.rooms = [...response.rooms]; 
                    this.fees = [...response.fees];

                    this.dialogRef = this._matDialog
                        .open(ManageMasterRollBookingsComponent,
                        {
                            panelClass: 'manage-master-roll-bookings',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                children: this.selectedChildren,
                                fees: this.fees,
                                rooms: this.rooms,
                                abs_reason: response.abs_reason,
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
            
                            this._masterRollService.onCalendarBuildChanged.next(null);
            
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
     * attendance report
     *
     * @param {MouseEvent} e
     */
    attendanceReport(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading || this.buttonLoader || this.selectedChildren.length === 0 || this.occupancyButtonLoader)
        {
            return;    
        }

        this.dialogRef = this._matDialog
            .open(ChildrenAttendanceReportComponent,
            {
                panelClass: 'children-attendance-report',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    action: AppConst.modalUpdateTypes.BULK,
                    children: this.selectedChildren,
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

                this._masterRollService.onCalendarBuildChanged.next(null);

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    }

    /**
     * update bulk attendance
     *
     * @param {MouseEvent} e
     */
    updateBatchAttendance(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading || this.buttonLoader || this.selectedChildren.length === 0 || this.occupancyButtonLoader)
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
                    children: this.selectedChildren,
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

                this._masterRollService.onCalendarBuildChanged.next(null);

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    }

    /**
     * print time sheet 
     *
     * @param {any} e
     * @returns {void}
     */
    openTimeSheet(e: any): void
    {
        e.preventDefault();

        e.srcElement.blur();

        if (this.weekCalendarLoading || this.buttonLoader || this.rooms.length < 1 || this.occupancyButtonLoader)
        {
            return;    
        }

        this.timeSheetModal = this._modalService
            .create({
                nzTitle: 'Print Sign-In Sheet',
                nzContent: MasterRollTimeSheetComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'set-absence-reason-modal',
                nzComponentParams: {
                    rooms: this.rooms
                },
                nzAutofocus: 'cancel',
                nzFooter: [
                    {
                        label: 'DOWNLOAD',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.timeSheetForm.valid),
                        onClick: componentInstance => componentInstance!.printTimeSheet()
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.timeSheetModal.destroy()
                    }
                ]
            });
    }

    /*----------------------------------------------------*/

    /**
     * view room occupancy booking summary
     *
     * @param {MouseEvent} e
     */
    openOccupancyView(e: MouseEvent): void
    {
        e.preventDefault(); 

        if (this.weekCalendarLoading || this.buttonLoader || this.rooms.length < 1 || this.occupancyButtonLoader)
        {
            return;    
        }

        if (!this.toggleOccupancyView)
        {
            this.getOccupancyBooking().then(() => 
            {
                this.toggleOccupancyView =  true;

                this._masterRollService.occupancyToggleChange.next(this.toggleOccupancyView);
    
                this.directiveInnerScroll.handelScrollOnDemand(this.toggleOccupancyView);
            });
        }
        else
        {
            this.toggleOccupancyView = false;

            this._masterRollService.occupancyToggleChange.next(this.toggleOccupancyView);

            this.directiveInnerScroll.handelScrollOnDemand(this.toggleOccupancyView);
        }
    }

    /**
     * get booking for Occupancy
     */
    getOccupancyBooking(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.occupancyButtonLoader = true;

            this._masterRollService
                .getOccupancy()
                .pipe(
                    tap(response => setTimeout(() => this.buildOccupancyList(response))),
                    finalize(() => 
                    {
                        this.occupancyButtonLoader = false;

                        resolve(null);
                    }),
                    takeUntil(this._unsubscribeAll)
                )
                .subscribe(
                    () => 
                    {
                        this.toggleOccupancyView =  true;

                        this._masterRollService.occupancyToggleChange.next(this.toggleOccupancyView);
            
                        this.directiveInnerScroll.handelScrollOnDemand(this.toggleOccupancyView);
                    },
                    error =>
                    {
                        throw error;
                    }
                );
        });
    }

    /**
     * build occupancy list
     */
    buildOccupancyList(list: Booking[]): void
    {
        // reset
        this.OccupancyList = [];

        let dates: { start: string, end: string } = this._masterRollService.dateParams;

        if (_.isNull(dates))
        {
            dates = {
                start: DateTimeHelper.now().startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly),
                end: DateTimeHelper.now().endOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly)
            };
        }

        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(dates.start).startOf('isoWeek'),
            DateTimeHelper.parseMoment(dates.end).endOf('isoWeek'));
        
        // add centre wise info
        const centreSummary = [];

        for (const item of dateRange)
        {
            if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0)) continue;

            centreSummary.push({
                date: item.format('YYYY-MM-DD'),
                day: _.capitalize(item.format('dddd')),
                weekSummary: { bookings: 0, capacity: 0, percent: 0 }            
            });
        }

        this.OccupancyList.push({ room: null, summary: centreSummary });

        // add room wise info
        for (const room of this.rooms)
        {
            const summary = [];

            for (const item of dateRange)
            {
                if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0)) continue;

                const weekTotalBookings = list.filter(i => i.room.id === room.id && i.date === item.format('YYYY-MM-DD')).length;
                const weekTotalRoomCapacity = room.getRoomCapacity(item.format('YYYY-MM-DD'));
                // const weekTotalAbsence = (list.filter(i => i.room.id === room.id && i.date === item.format('YYYY-MM-DD')).filter(i => i.isAbsent()).length);
                // const weekTotalHoliday = (list.filter(i => i.room.id === room.id && i.date === item.format('YYYY-MM-DD')).filter(i => i.isHoliday()).length);
                // const weekTotalCasual = (list.filter(i => i.room.id === room.id && i.date === item.format('YYYY-MM-DD')).filter(i => i.isCasual).length);
                // const weekTotalAttended = (list.filter(i => i.room.id === room.id && i.date === item.format('YYYY-MM-DD')).filter(i => !i.isAbsent() && i.attendance).length);
                // const weekTotalMissing = (list.filter(i => i.room.id === room.id && i.date === item.format('YYYY-MM-DD')).filter(i => !i.isAbsent() && !i.attendance).length);
                // const weekTotalInCompleted = (list.filter(i => i.room.id === room.id && i.date === item.format('YYYY-MM-DD')).filter(i => !i.isHoliday() && !i.isAbsent() && (i.attendance && !i.attendance.checkOutTime)).length);

                _.head(this.OccupancyList).summary.find(i => i.date === item.format('YYYY-MM-DD')).weekSummary.bookings += weekTotalBookings;
                _.head(this.OccupancyList).summary.find(i => i.date === item.format('YYYY-MM-DD')).weekSummary.capacity += weekTotalRoomCapacity;

                summary.push({
                    date: item.format('YYYY-MM-DD'),
                    day: _.capitalize(item.format('dddd')),
                    weekSummary: {
                        bookings: weekTotalBookings,
                        capacity: weekTotalRoomCapacity,
                        percent: ((weekTotalRoomCapacity < weekTotalBookings ? weekTotalRoomCapacity : weekTotalBookings) / weekTotalRoomCapacity) * 100
                    }            
                });
            }

            this.OccupancyList.push({ room: room, summary: summary });
        }
    }

    /**
     * check if room selected in occupancy list
     *
     * @param {*} item
     * @returns {boolean}
     */
    isOccupancyRoomSelected(item: any): boolean
    {
        return !_.isNull(item.room) && this.filterBy?.room && item.room.id === this.filterBy.room;
    }

    /**
     * filter by room
     *
     * @param {MouseEvent} e
     * @param {*} item
     * @returns {void}
     */
    filterByRoom(e: MouseEvent, item: any): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading || this.buttonLoader || this.rooms.length < 1 || this.occupancyButtonLoader || (!_.isNull(item.room) && this.filterBy?.room && item.room.id === this.filterBy.room))
        {
            return;    
        }

        this._masterRollService.setOccupancyRoom.next(item.room.id);
    }

    /**
     * cleanse text
     *
     * @param {string} text
     * @returns {string}
     */
    getOccupancyRoomLabel(text: string): string
    {
        return _.trim(text).replace(/[^a-zA-Z &]/g, '');
    }
}

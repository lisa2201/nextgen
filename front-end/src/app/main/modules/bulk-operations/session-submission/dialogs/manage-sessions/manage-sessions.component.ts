import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { finalize } from 'rxjs/internal/operators/finalize';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { forkJoin, Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BulkSessionSubmissionService } from '../../services/bulk-session-submission.service';
import { ChildBookingService } from 'app/main/modules/child/booking/services/booking.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { AuthService } from 'app/shared/service/auth.service';

import { AuthClient } from 'app/shared/model/authClient';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { SessionSubmissionItem } from 'app/main/modules/child/session-submission/dialogs/add-submission-report/add-submission-report.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { UpdateSessionSlotComponent } from 'app/main/modules/modules-shared/session-submission/update-session-slot/update-session-slot.component';

@Component({
    selector: 'bulk-submissions-manage-sessions',
    templateUrl: './manage-sessions.component.html',
    styleUrls: ['./manage-sessions.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BulkSubmissionsManageSessionsComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    dialogTitle: string;
    buttonLoader: boolean;
    hideWeekEnd: boolean;
    calendarWeek: any;
    dependActions: any;
    dependChangeReason: any;

    sessionPreviewList: SessionSubmissionItem[];

    updateSessionSlotModal: NzModalRef;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        public matDialogRef: MatDialogRef<BulkSubmissionsManageSessionsComponent>,
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _bookingService: ChildBookingService,
        private _bulkSessionSubmissionService: BulkSessionSubmissionService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.dialogTitle = 'Manage Submission Report';
        this.buttonLoader = false;
        this.hideWeekEnd = this._bookingService.calenderSettings.hideWeekEnd;
        this.client = this._authService.getClient();
        
        this.calendarWeek = this._data.calendar_week;
        this.dependActions = this._data.submission_actions;
        this.dependChangeReason = this._data.submission_change_reasons;

        this.sessionPreviewList = this._data.response.items;

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
        this._logger.debug('bulk session - manager dialog !!!', this._data);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.updateSessionSlotModal)
        {
            this.updateSessionSlotModal.close();
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
     * get preview title
     *
     * @returns {*}
     */
    getPreviewTitle(): any
    {
        return {
            start: DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek').format('MMMM Do YYYY'),
            end: DateTimeHelper.parseMoment(this.calendarWeek).endOf('isoWeek').format('MMMM Do YYYY')
        };
    }

    /**
     * check if updates available
     *
     * @readonly
     * @type {boolean}
     */
    get sessionUpdatesFound(): boolean
    {
        return this.sessionPreviewList.filter(i => i.bookings.filter(b => b.hasSessionUpdate).length > 0).length > 0;
    }

    /**
     * check if session has any errors
     *
     * @returns {boolean}
     */
    sessionHasConflicts(): boolean
    {
        return this.sessionPreviewList.filter(i => i.bookings.filter(b => b.hasSessionError).length > 0).length > 0;
    }

    /**
     * build list item
     */
    buildSessionListViewItem(booking: Booking, sessionHasCasual: boolean, item: any): any
    {
        booking.setSessionRoutineStatus((booking.isCasual && sessionHasCasual) || (this._data.response.sessionRoutine.filter((i: { day: number; }) => i.day === item.day()).length > 0));

        // get already submitted sessions
        booking.setSessionUpdatedStatus(
            !_.isEmpty(this._data.response.selectedSessionDates) &&
            ((booking.attendance && booking.attendance.sessionSubmitted) || this._data.response.selectedSessionDates.filter((i: string) => (booking.attendance && booking.attendance.sessionSubmitted) && i === booking.date).length > 0)
        );

        // check for new updates
        booking.setHasSessionUpdateStatus(
            !booking.isHoliday() && !_.isEmpty(this._data.response.selectedSessionDates) && (_.indexOf(this._data.response.selectedSessionDates, booking.date) < 0 || !booking.sessionUpdated)
        );
        
        // set disable booking
        booking.isDisabled = _.isNull(booking.attendance)
            || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime))
            || booking.isHoliday();

        booking.hasSessionError = !booking.isHoliday() && _.isNull(booking.attendance) || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime));
        
        return booking;
    }

    /**
     * update booking type
     *
     * @param {MouseEvent} e
     * @param {Booking} item
     * @param {number} rowIndex
     * @param {number} bookingIndex
     * @returns {void}
     */
    updateSessionSlot(e: MouseEvent, item: Booking, rowIndex: number, bookingIndex: number): void
    {
        e.preventDefault();

        if(this.buttonLoader)
        {
            return;
        }
        
        this.buttonLoader = true;

        forkJoin([
            this._bookingService.getAbsenceReasons().toPromise(),
            this._bookingService.getBooking(item.id)
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                ([reasons, bookingSlot]) =>
                {
                    if (_.isEmpty(reasons)) 
                    { 
                        return; 
                    }

                    this.updateSessionSlotModal = this._modalService
                        .create({
                            nzTitle: `Update Booking - ${item.date}`,
                            nzContent: UpdateSessionSlotComponent,
                            nzMaskClosable: false,
                            nzWrapClassName: 'update-session-slot-modal',
                            nzComponentParams: {
                                reasons: reasons,
                                selected: bookingSlot
                            },
                            nzFooter: [
                                {
                                    label: 'SAVE',
                                    type: 'primary',
                                    disabled: componentInstance => !(componentInstance!.updateSessionSlotForm.valid),
                                    onClick: componentInstance =>
                                    {
                                        return componentInstance
                                            .saveChanges()
                                            .then(
                                                res => 
                                                {
                                                    try
                                                    {
                                                        // update table view
                                                        this.sessionPreviewList[rowIndex].bookings[bookingIndex] = this.buildSessionListViewItem(
                                                            res.item, 
                                                            (this._data.response.sessionRoutine.filter((i: { is_casual: boolean; }) => i.is_casual).length > 0),
                                                            this.sessionPreviewList[rowIndex].dateObject
                                                        );
    
                                                        // update parent list
                                                        this._bulkSessionSubmissionService.onBookingUpdated.next({
                                                            id: this._data.response.id,
                                                            child: this._data.response.child,
                                                            list: this.sessionPreviewList,
                                                            booking: res.item
                                                        });

                                                        setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                                                        
                                                        this.updateSessionSlotModal.destroy();
                                                    }
                                                    catch(error)
                                                    {
                                                        throw error;
                                                    }
                                                }
                                            );
                                    }
                                },
                                {
                                    label: 'CLOSE',
                                    type: 'danger',
                                    onClick: () => this.updateSessionSlotModal.destroy()
                                }
                            ]
                        });
                },
                error =>
                {
                    throw error;
                }
            );
    }

}

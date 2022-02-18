import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { slideMotion, fadeMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { CommonService } from 'app/shared/service/common.service';
import { ChildBookingService } from '../../../booking/services/booking.service';
import { ChildSessionSubmissionService } from '../../services/session-submission.service';
import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { SessionSubmission } from '../../session-submission.model';
import { Booking } from '../../../booking/booking.model';
import { AuthClient } from 'app/shared/model/authClient';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { SessionSubmissionItem, SubmissionItem } from '../add-submi\ssion-report/add-submission-report.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';

import { UpdateSessionSlotComponent } from 'app/main/modules/modules-shared/session-submission/update-session-slot/update-session-slot.component';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'child-resubmit-session',
    templateUrl: './resubmit-session.component.html',
    styleUrls: ['./resubmit-session.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildResubmitSessionComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    buttonLoader: boolean;
    buttonSessionLoader: boolean;

    session: SessionSubmission;
    sessionList: Booking[];
    selectedSessionDates: any;
    enrolmentRoutine: any;

    sessionPreviewList: SessionSubmissionItem[];
    isAllPreviewDataChecked: boolean;
    isPreviewIndeterminate: boolean;
    sessionSelectionErrorStatus: string;
    preSchoolStatus: string;
    isNoCareProvided: boolean;

    client: AuthClient;
    hideWeekEnd: boolean;

    updateSessionSlotModal: NzModalRef;
    confirmModal: NzModalRef;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<ChildResubmitSessionComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {MatDialog} _matDialog
     * @param {ChildBookingService} _bookingService
     * @param {ChildSessionSubmissionService} _sessionService
     * @param {AuthService} _authService
     * @param {NzModalService} _modalService
     * @param {NotificationService} _notification
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ChildResubmitSessionComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _bookingService: ChildBookingService,
        private _sessionService: ChildSessionSubmissionService,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.session = this._data.session;
        this.sessionList = this._data.response.bookings;
        this.selectedSessionDates = this._data.response.selected;
        this.enrolmentRoutine = this._data.response.enrolment_routine;
        this.preSchoolStatus = this._data.response.pre_school_status;
        this.isNoCareProvided = this._data.response.is_no_care;

        this.buttonLoader = false;
        this.buttonSessionLoader = false;
        this.dialogTitle = 'Resubmit Session';
        this.client = this._authService.getClient();
        this.hideWeekEnd = this._bookingService.calenderSettings.hideWeekEnd;

        this.sessionPreviewList = [];
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;
        this.sessionSelectionErrorStatus = '';

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
        this._logger.debug('resubmit child session !!!', this._data);

        this.buildSessionListView();
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

        if (this.confirmModal)
        {
            this.confirmModal.close();
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
            start: DateTimeHelper.parseMoment(this.session.startDate).startOf('isoWeek').format('MMMM Do YYYY'),
            end: DateTimeHelper.parseMoment(this.session.endDate).endOf('isoWeek').format('MMMM Do YYYY')
        };
    }

    /**
     * build session preview list
     */
    buildSessionListView(): void
    {
        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.session.startDate).startOf('isoWeek'), 
            DateTimeHelper.parseMoment(this.session.endDate).endOf('isoWeek'));
        
        const sessionHasCasual = this.enrolmentRoutine.filter((i: { is_casual: boolean; }) => i.is_casual).length > 0;

        for (const item of dateRange) 
        {
            if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
            {
                continue;
            }
            
            const bookings = this.sessionList.filter(i => i.date === item.format('YYYY-MM-DD'));

            for (let booking of bookings)
            {
                booking = this.buildSessionListViewItem(booking, sessionHasCasual, item);
            }

            this.sessionPreviewList.push({
                id: uuid.v4(),
                date: item.format('YYYY-MM-DD'),
                day: _.capitalize(item.format('dddd')),
                dateObject: item,
                bookings: bookings
            });
        }
    }

    /**
     * build list item
     */
    buildSessionListViewItem(booking: Booking, sessionHasCasual: boolean, item: any): any
    {
        booking.setSessionRoutineStatus((booking.isCasual && sessionHasCasual) || (this.enrolmentRoutine.filter((i: { day: number; }) => i.day === item.day()).length > 0));

        // // get already submitted sessions
        // booking.setSessionUpdatedStatus(
        //     !_.isEmpty(this.selectedSessionDates) && 
        //     ((booking.attendance && booking.attendance.sessionSubmitted) || this.selectedSessionDates.filter((i: string) => (booking.attendance && booking.attendance.sessionSubmitted) && i === booking.date).length > 0)
        // );

        // // check for new updates
        // booking.setHasSessionUpdateStatus(
        //     !booking.isHoliday() && !_.isEmpty(this.selectedSessionDates) && (_.indexOf(this.selectedSessionDates, booking.date) < 0 || !booking.sessionUpdated)
        // );

        booking.isDisabled = _.isNull(booking.attendance)
            || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime))
            || booking.isHoliday();

        // update session list
        this.sessionList[this.sessionList.findIndex(i => i.id === booking.id)] = booking;

        return booking;
    }

    /**
     * select all items
     *
     * @param {boolean} value
     * @returns {void}
     */
    checkAllPreviews(value: boolean): void
    {
        if (_.isEmpty(this.sessionList))
        {
            return;
        }

        this.sessionList
            .filter(i => !i.isDisabled)
            .forEach(i => i.isSelected = value);

        this.refreshSessionSelectionStatus();
    }

    /**
     * check if any session item enabled
     */
    isAnySessionItemEnabled(): any
    {
        return this.sessionList
            .filter(i => !i.isDisabled);
    }

    /**
     * get selected session preview items
     */
    getSelectedPreviewSessionItems(): any
    {
        return this.sessionList.filter(i => !i.isDisabled && i.isSelected);
    }

    /**
     * check if session preview selected
     */
    hasPreviewSessionSelected(): boolean
    {
        return this.getSelectedPreviewSessionItems().length > 0;
    }

    /**
     * check sessions selected
     */
    refreshSessionSelectionStatus(): void
    {
        this.isAllPreviewDataChecked = this.sessionList
            .filter(i => !i.isDisabled)
            .every(i => i.isSelected);

        this.isPreviewIndeterminate = this.sessionList.filter(i => !i.isDisabled).some(i => i.isSelected) && !this.isAllPreviewDataChecked;

        this.sessionSelectionErrorStatus = !this.hasPreviewSessionSelected() ? 'error' : '';
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

        if (this.buttonSessionLoader || this.buttonLoader)
        {
            return;
        }
        
        this.buttonSessionLoader = true;

        forkJoin([
            this._bookingService.getAbsenceReasons().toPromise(),
            this._bookingService.getBooking(item.id)
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonSessionLoader = false, 200))
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
                                                        // update list
                                                        this.sessionList[this.sessionList.findIndex(i => i.id === res.id)] = res.item;

                                                        // update table view
                                                        this.sessionPreviewList[rowIndex].bookings[bookingIndex] = this.buildSessionListViewItem(
                                                            res.item,
                                                            (this.enrolmentRoutine.filter((i: { is_casual: boolean; }) => i.is_casual).length > 0),
                                                            this.sessionPreviewList[rowIndex].dateObject
                                                        );

                                                        this.refreshSessionSelectionStatus();
                                                        
                                                        setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                                                    } 
                                                    catch (error) 
                                                    {
                                                        throw error;
                                                    }

                                                    this.updateSessionSlotModal.destroy();
                                                }
                                            )
                                            .catch(error => 
                                            {
                                                throw error;
                                            });
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

    /**
     * resubmit session
     *
     * @param {MouseEvent} e
     */
    saveChanges(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.buttonLoader || this.buttonSessionLoader || (!this.isNoCareProvided && !this.hasPreviewSessionSelected()))
        {
            return;
        }

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.UPDATE.TITLE,
                    nzContent: AppConst.dialogContent.UPDATE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'primary',
                    nzOnOk: () => 
                    {
                        return new Promise((resolve, reject) =>
                        {
                            const sessionsList: SubmissionItem[] = [];
                    
                            for (const item of this.getSelectedPreviewSessionItems() as Booking[])
                            {
                                const session: SubmissionItem = {
                                    date: item.date,
                                    startTime: DateTimeHelper.convertMinTo24HourString(item.sessionStart),
                                    endTime: DateTimeHelper.convertMinTo24HourString(item.sessionEnd),
                                    sessionFeeDescription: 'Fee Applied',
                                    isChildAbsent: item.isAbsent(),
                                    absenceReason: item.absenceNoteCode === 'NONE' ? '' : item.absenceNoteCode,
                                    absenceDocumentHeld: (item.isAbsent() && item.isAbsentDocumentHeld),
                                    amountCharged: parseFloat(item.price).toFixed(2),
                                    sessionUnitOfMeasure: item.fee.frequency,
                                    isPreSchoolProgram: this.preSchoolStatus,
                                    Attendances: [],
                                    bookingId: item.id,
                                    isNoCareProvided: false
                                };
                    
                                if (!item.isAbsent())
                                {
                                    session.Attendances = [
                                        {
                                            timeIn: DateTimeHelper.convertMinTo24HourString(item.attendance.checkInTime),
                                            timeOut: DateTimeHelper.convertMinTo24HourString(item.attendance.checkOutTime)
                                        }
                                    ];    
                                }
                    
                                sessionsList.push(session);
                            }
                    
                            const sendObj = {
                                id: this.session.id,
                                sessions: sessionsList
                            };
                    
                            this._logger.debug('[submit child session report]', sendObj);
                    
                            this.buttonLoader = true;
                    
                            this._sessionService
                                .resubmitSessionReport(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => 
                                    {
                                        this.buttonLoader = false;

                                        resolve();
                                    })
                                )
                                .subscribe(
                                    response =>
                                    {
                                        setTimeout(() => this.matDialogRef.close(response), 250);
                                    },
                                    error =>
                                    {
                                        throw error;
                                    }
                                );
                        });
                    }
                });
    }

}

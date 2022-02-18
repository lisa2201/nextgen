import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject, forkJoin } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NzModalRef } from 'ng-zorro-antd/modal';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';

import { NzModalService } from 'ng-zorro-antd';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { ChildSessionSubmissionService } from '../../services/session-submission.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { ChildBookingService } from '../../../booking/services/booking.service';

import { Child } from '../../../child.model';
import { Booking } from '../../../booking/booking.model';
import { AuthClient } from 'app/shared/model/authClient';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { UpdateSessionSlotComponent } from 'app/main/modules/modules-shared/session-submission/update-session-slot/update-session-slot.component';

export interface SessionSubmissionItem {
    id: string;
    date: string;
    day: string;
    dateObject: any;
    bookings: Booking[];
}

export interface SubmissionItem {
    date: string;
    startTime: string;
    endTime: string;
    sessionFeeDescription: string;
    amountCharged: string;
    sessionUnitOfMeasure: string;
    isChildAbsent: boolean;
    absenceReason: string;
    absenceDocumentHeld: boolean;
    Attendances: SessionAttendance[];
    isPreSchoolProgram: string;
    bookingId: string;
    isNoCareProvided: boolean;
}

export interface SessionAttendance {
    timeIn: string;
    timeOut: string;
}

@Component({
    selector: 'child-add-submission-report',
    templateUrl: './add-submission-report.component.html',
    styleUrls: ['./add-submission-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildAddSubmissionReportComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    submissionForm: FormGroup;

    child: Child;
    buttonLoader: boolean;
    buttonSaveLoader: boolean;
    dependActions: any;
    dependChangeReason: any;

    disableActionField: boolean;
    hideWeekEnd: boolean;

    previewSession: boolean;
    sessionList: Booking[];
    selectedSessionDates: any;
    enrolmentRoutine: any;

    sessionPreviewList: SessionSubmissionItem[];
    isAllPreviewDataChecked: boolean;
    isPreviewIndeterminate: boolean;
    sessionSelectionErrorStatus: string;
    preSchoolStatus: string;
    isNoCareProvided: boolean;
    formSubmittable: boolean; 

    client: AuthClient;

    updateSessionSlotModal: NzModalRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {MatDialogRef<ChildAddSubmissionReportComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {MatDialog} _matDialog
     * @param {AuthService} _authService
     * @param {NzModalService} _modalService
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ChildAddSubmissionReportComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _sessionService: ChildSessionSubmissionService,
        private _notification: NotificationService,
        private _bookingService: ChildBookingService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.dialogTitle = `Create New Submission Report (${this._data.enrolment_id})`;
        this.buttonLoader = false;
        this.buttonSaveLoader = false;
        this.child = this._data.child;
        this.dependActions = this._data.submission_actions;
        this.dependChangeReason = this._data.submission_change_reasons;
        this.enrolmentRoutine = this._data.enrolment_routine;

        this.disableActionField = true;
        this.hideWeekEnd = false; // this._bookingService.calenderSettings.hideWeekEnd;

        this.previewSession = false;
        this.sessionList = [];
        this.sessionPreviewList = [];
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;
        this.sessionSelectionErrorStatus = '';
        this.preSchoolStatus = '';
        this.isNoCareProvided = false;
        this.formSubmittable = true;

        this.client = this._authService.getClient();

        this.submissionForm = this.createSubmissionForm();

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
        this._logger.debug('child add submission report !!!', this._data);

        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.submissionForm
            .get('week')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.getPreviewSessions(value));

        this.submissionForm
            .get('action')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.validateAction(value));
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if(this.updateSessionSlotModal)
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
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.submissionForm.controls;
    }

    /**
     * returns true if control has the validator
     *
     * @param {string} control
     * @param {string} validator
     * @returns {boolean}
     */
    hasValidator(control: string, validator: string): boolean
    {
        if (_.isNull(this.submissionForm.get(control).validator))
        {
            return false;
        }

        const formControl = this.submissionForm.get(control).validator({} as AbstractControl);

        return formControl && formControl.hasOwnProperty(validator);
    }

    /**
     * disable future weeks
     */
    disabledFutureWeeks = (startValue: Date): boolean =>
    {
        return differenceInCalendarDays(startValue, DateTimeHelper.now().endOf('isoWeek').toDate()) > 0;
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createSubmissionForm(): FormGroup
    {
        return new FormGroup({
            week: new FormControl('', [Validators.required]),
            action: new FormControl(_.head(Object.keys(this.dependActions)), [Validators.required]),

            change_reason: new FormControl(null),
            reason_late_change: new FormControl('', [Validators.maxLength(1000)]),
            reason_no_change: new FormControl('', [Validators.maxLength(1000)])
        });
    }

    /**
     * check validation rules for action changes
     *
     * @param {string} value
     */
    validateAction(value: string): void
    {
        // reset validation
        this.submissionForm.get('change_reason').clearValidators();
        this.submissionForm.get('change_reason').patchValue(null, { emitEvent: false });
        this.submissionForm.get('change_reason').updateValueAndValidity();
        this.submissionForm.get('change_reason').reset();

        this.submissionForm.get('reason_late_change').clearValidators();
        this.submissionForm.get('reason_late_change').patchValue('', { emitEvent: false });
        this.submissionForm.get('reason_late_change').updateValueAndValidity();
        this.submissionForm.get('reason_late_change').reset();

        this.submissionForm.get('reason_no_change').clearValidators();
        this.submissionForm.get('reason_no_change').patchValue('', { emitEvent: false });
        this.submissionForm.get('reason_no_change').updateValueAndValidity();
        this.submissionForm.get('reason_no_change').reset();

        if (value === 'VARY')
        {
            this.submissionForm.get('change_reason').setValidators([Validators.required]);
            this.submissionForm.get('change_reason').updateValueAndValidity();

            const perms = [Validators.maxLength(1000)];
            if (DateTimeHelper.now().diff(DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek'), 'days') >= 28) perms.push(Validators.required);
            
            this.submissionForm.get('reason_late_change').setValidators(perms);
            this.submissionForm.get('reason_late_change').updateValueAndValidity();
        }

        if (value === 'NOCHG')
        {
            this.submissionForm.get('reason_no_change').setValidators([Validators.required, Validators.maxLength(1000)]);
            this.submissionForm.get('reason_no_change').updateValueAndValidity();
        }
    }

    /**
     * get session previews on week change
     *
     * @param {string} value
     * @returns {void}
     */
    getPreviewSessions(value: string): void
    {
        if (_.isNull(value))
        {
            return;
        }

        const sendObj = {
            id: this.child.id,
            enrol_id: this._data.enrolment_id,
            start: DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format('YYYY-MM-DD'),
            end: DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format('YYYY-MM-DD')
        };

        this._logger.debug('[get session details]', sendObj);

        // reset list
        this.sessionPreviewList = [];

        setTimeout(() =>
        {
            this.buttonLoader = this.formSubmittable = true;

            this._sessionService
                .getSessionInformation(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => setTimeout(() => this.buttonLoader = false, 200))
                )
                .subscribe(
                    response =>
                    {
                        if (_.isEmpty(response))
                        {
                            return;
                        }

                        this.isNoCareProvided = response.is_no_care;

                        if (this.isNoCareProvided)
                        {
                            this.validateActionField();
                        }
                        else
                        {
                            this.sessionList = response.bookings;
                            this.selectedSessionDates = response.selected;
                            this.preSchoolStatus = response.pre_school_status;

                            if (_.isEmpty(this.sessionList))
                            {
                                setTimeout(() => this._notification.displaySnackBar('Sessions not available for this week!', NotifyType.ERROR), 50);

                                return;
                            }
    
                            this.buildSessionListView();
                        }
                    },
                    error =>
                    {
                        setTimeout(() => this.sessionList = [], 250);

                        this.formSubmittable = false;

                        throw error;
                    }
                );

        }, 50);
    }

    /**
     * go to preview session dates
     *
     * @param {MouseEvent} e
     */
    previewSessionSlots(e: MouseEvent): void
    {
        e.preventDefault();

        this.previewSession = true;

        setTimeout(() =>
        {
            this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 50);

            this.updateScroll();
        }, 150);
    }

    /**
     * get preview title
     *
     * @returns {*}
     */
    getPreviewTitle(): any
    {
        return {
            start: DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format('MMMM Do YYYY'),
            end: DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format('MMMM Do YYYY')
        };
    }

    /**
     * build session preview list
     */
    buildSessionListView(): void
    {
        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek'))

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

        this.validateActionField();

        if (this.hasPreviewSessionSelected())
        {
            this.refreshSessionSelectionStatus();
        }
    }

    /**
     * build list item
     */
    buildSessionListViewItem(booking: Booking, sessionHasCasual: boolean, item: any): any
    {
        booking.setSessionRoutineStatus((booking.isCasual && sessionHasCasual) || (this.enrolmentRoutine.filter((i: { day: number; }) => i.day === item.day()).length > 0));

        // get already submitted sessions
        booking.setSessionUpdatedStatus(
            !_.isEmpty(this.selectedSessionDates) && 
            ((booking.attendance && booking.attendance.sessionSubmitted) || this.selectedSessionDates.filter((i: string) => (booking.attendance && booking.attendance.sessionSubmitted) && i === booking.date).length > 0)
        );

        // check for new updates
        booking.setHasSessionUpdateStatus(
            !booking.isHoliday() && !_.isEmpty(this.selectedSessionDates) && (_.indexOf(this.selectedSessionDates, booking.date) < 0 || !booking.sessionUpdated)
        );

        // booking.isDisabled = _.isNull(booking.attendance)
        //     || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime))
        //     || booking.isHoliday() || !booking.hasSessionRoutine || booking.sessionUpdated;
        booking.isDisabled = _.isNull(booking.attendance)
            || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime))
            || booking.isHoliday();
        
        // auto select already updated once
        booking.isSelected = booking.sessionUpdated;

        // update session list
        this.sessionList[this.sessionList.findIndex(i => i.id === booking.id)] = booking;

        return booking;
    }

    /**
     * close session preview view
     *
     * @param {MouseEvent} e
     */
    closeSessionPreview(e: MouseEvent): void
    {
        e.preventDefault();

        this.previewSession = false;
        this.sessionList = [];
        this.sessionPreviewList = [];
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;
        this.sessionSelectionErrorStatus = '';

        this.buttonSaveLoader = false;

        // week form fix
        setTimeout(() => this.submissionForm.get('week').updateValueAndValidity());
    }

    /**
     * get submitted sessions
     *
     * @readonly
     * @type {boolean}
     */
    get sessionUpdatesFound(): boolean
    {
        return this.sessionList.filter(i => i.sessionUpdated).length > 0;
    }

    /**
     * get new update sessions
     *
     * @readonly
     * @type {boolean}
     */
    get sessionHasUpdatesFound(): boolean
    {
        return this.sessionList.filter(i => i.hasSessionUpdate).length > 0;
    }

    /**
     * validate if new updates found
     */
    validateActionField(): void
    {
        setTimeout(() =>
        {
            if (this.isNoCareProvided)
            {
                this.submissionForm.get('action').patchValue(Object.keys(this.dependActions)[3]);

                this.disableActionField = true;
            }
            else
            {
                this.submissionForm.get('action').patchValue(Object.keys(this.dependActions)[this.sessionHasUpdatesFound ? 1 : 0]);

                // this.disableActionField = !this.sessionHasUpdatesFound;
                this.disableActionField = false;
            }
        });
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
        return this.sessionList.filter(i => !i.isDisabled);
    }

    /**
     * get selected session preview items
     */
    getSelectedPreviewSessionItems(): any
    {
        return this.sessionList.filter(i => (!i.isDisabled || i.sessionUpdated) && i.isSelected);
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
     * check if session slots available
     */
    enablePreviewView(): boolean
    {
        // return this.sessionPreviewList.filter(i => i.bookings.filter(b => !b.isDisabled || (!b.isHoliday() && b.hasSessionRoutine && !b.attendance)).length).length > 0;
        // return this.sessionPreviewList.filter(i => i.bookings.filter(b => !b.isDisabled).length).length > 0;
        return !this.formSubmittable || this.buttonLoader || (!this.isNoCareProvided && _.isEmpty(this.sessionList));
    }

    /**
     * get form values
     *
     * @returns {*}
     */
    getFormValues(): any
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
            child: this.child.id,
            enrol_reference: this._data.enrolment_reference,
            enrol_id: this._data.enrolment_id,
            start_date: DateTimeHelper.getUtcDate(DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek')),
            end_date: DateTimeHelper.getUtcDate(DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek')),
            report_date: DateTimeHelper.getUtcDate(DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek')),
            action: this.fc.action.value,
            change_reason: this.fc.change_reason.value,
            reason_late_change: this.fc.reason_late_change.value,
            reason_no_change: this.fc.reason_no_change.value,
            sessions: sessionsList
        };

        if (this.isNoCareProvided) sendObj['is_no_care_provided'] = true;

        return sendObj;
    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.submissionForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.disableActionField = true;
        this.previewSession = false;
        this.sessionList = [];
        this.sessionPreviewList = [];
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;
        this.sessionSelectionErrorStatus = '';
        this.formSubmittable = true;

        this.submissionForm.get('action').patchValue(_.head(Object.keys(this.dependActions)));
        setTimeout(() => this.submissionForm.get('action').disable({ emitEvent: false }));
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();
        
        if (this.buttonSaveLoader || this.submissionForm.invalid || this.enablePreviewView() || (!this.isNoCareProvided && (!this.hasPreviewSessionSelected())))
        {
            return;
        }

        const sendObj = this.getFormValues();

        this._logger.debug('[submit child session report]', sendObj);

        this.buttonSaveLoader = true;

        this._sessionService
            .storeSessionReport(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonSaveLoader = false)
            )
            .subscribe(
                response =>
                {
                    setTimeout(() => this.matDialogRef.close(response), 250);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );

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

}

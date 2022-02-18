import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';
import { NzModalService, NzModalRef } from 'ng-zorro-antd/modal';

import { BulkSessionSubmissionService } from '../../../services/bulk-session-submission.service';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { SessionSubmissionItem, SubmissionItem } from 'app/main/modules/child/session-submission/dialogs/add-submission-report/add-submission-report.component';
import { AuthClient } from 'app/shared/model/authClient';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Child } from 'app/main/modules/child/child.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';

import { BulkSubmissionsManageSessionsComponent } from '../../../dialogs/manage-sessions/manage-sessions.component';
import { BulkSubmissionsSetUpdateValuesComponent } from '../../../modals/set-update-values/set-update-values.component';

export interface WaitingItems {
    id: string;
    child: Child;
    enrolmentId: string;
    enrolmentRef: string;
    enrolmentSessionType: string;
    sessionRoutine: Array<any>; 
    selectedSessionDates: Array<string>;
    showDetails: boolean;
    items: Array<SessionSubmissionItem>;
    hasError: boolean;
    hasUpdate: boolean;
    hasSessionCompleted: boolean;
    noCareProvided: boolean;
    preSchoolStatus: string;
    formValue: FormValues;
}

export interface FormValues {
    action: string;
    change_reason: string;
    reason_late_change: string;
    reason_no_change: string;
}

@Component({
    selector: 'bulk-session-waiting-tab',
    templateUrl: './waiting-tab.component.html',
    styleUrls: ['./waiting-tab.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BulkSubmissionWaitingTabComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;

    sessionList: Array<any>;

    formattedSessionList: Array<WaitingItems>;
    formattedSessionFilteredSource: Array<WaitingItems>;
    pageSizeWaiting: number;
    pageNumberWaiting: number;

    formattedSessionListWarning: Array<WaitingItems>;
    formattedSessionFilteredWarningSource: Array<WaitingItems>;
    pageSizeWaitingWarning: number;
    pageNumberWaitingWarning: number;

    dependActions: Array<any>;
    dependChangeReason: Array<any>;

    hideWeekEnd: boolean;
    buttonLoader: boolean;

    dialogRef: any;
    confirmModal: NzModalRef;
    setUpdateValueModal: NzModalRef;

    @Input() calendarWeek: any;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _bulkSessionSubmissionService: BulkSessionSubmissionService,
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _notification: NotificationService
    )
    {
        // set default values
        this.client = this._authService.getClient();

        this.sessionList = [];

        this.formattedSessionList = [];
        this.formattedSessionFilteredSource = [];
        this.pageSizeWaiting = 5;
        this.pageNumberWaiting = 1;

        this.formattedSessionListWarning = [];
        this.formattedSessionFilteredWarningSource = [];
        this.pageSizeWaitingWarning = 5;
        this.pageNumberWaitingWarning = 1;

        this.dependActions = [];
        this.dependChangeReason = [];

        this.hideWeekEnd = true;
        this.buttonLoader = false;

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
        this._logger.debug('session submission - tab waiting !!!');

        // Subscribe to waiting changes
        this._bulkSessionSubmissionService
            .onSessionChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => 
            {
                this.sessionList = data.sessionList;
                this.dependActions = data.dependActions;
                this.dependChangeReason = data.dependChangeReason;

                setTimeout(() => this.buildListView(), 50);
            });

        // Subscribe to calendar week changes
        this._bulkSessionSubmissionService
            .onCalendarWeekChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.calendarWeek = value);

         // Subscribe to reset tab list changes
        this._bulkSessionSubmissionService
            .resetTabListChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                // reset
                this.formattedSessionListWarning = [];
                this.formattedSessionList = [];
            });

        // Subscribe to booking updates
        this._bulkSessionSubmissionService
            .onBookingUpdated
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((item: { id: string, list: Array<any>, booking: Booking })  => 
            {
                setTimeout(() => 
                {
                    // update ui
                    const warningIndex = this.formattedSessionListWarning.findIndex(i => i.id === item.id);

                    if (warningIndex > -1)
                    {
                        this.formattedSessionListWarning[warningIndex].items = item.list;
                        this.formattedSessionListWarning[warningIndex].hasError = item.list.filter(i => i.bookings.filter((b: Booking) => b.hasSessionError).length > 0).length > 0;
                        this.formattedSessionListWarning[warningIndex].hasUpdate = item.list.filter(i => i.bookings.filter((b: Booking) => b.hasSessionUpdate).length > 0).length > 0;
                        this.formattedSessionListWarning[warningIndex].hasSessionCompleted = this.checkIfSessionCompleted([].concat.apply([], this.formattedSessionListWarning[warningIndex].items.map(i => i.bookings)), this.formattedSessionListWarning[warningIndex].selectedSessionDates);

                        this.transformValidSession(this.formattedSessionListWarning[warningIndex]);
                    }
                }, 50);
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        if (this.confirmModal)
        {
            this.confirmModal.close();
        }

        if (this.setUpdateValueModal)
        {
            this.setUpdateValueModal.close();
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
     * reset view
     */
    reset(): void
    {
        this.sessionList = [];
        this.formattedSessionListWarning = [];
        this.formattedSessionFilteredWarningSource = [];
        this.formattedSessionList = [];
        this.formattedSessionFilteredSource = [];
    }

    /**
     * get paginate submission list
     *
     * @param {*} array
     * @param {number} pageSize
     * @param {number} pageNumber
     * @returns {*}
     */
    paginateWaiting(array: any, pageSize: number, pageNumber: number): any
    {
        return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    }

    /*---------------------------------------------------------*/

    /**
     * on page change
     *
     * @param {number} page
     */
    onPaginateChangeWaitingWarnings(page: number): void
    {
        this.pageNumberWaitingWarning = page;
    }

    /**
     * get submission waiting ist
     *
     * @returns {Array<WaitingItems>}
     */
    getFilteredSourceWaitingWarnings(): Array<WaitingItems>
    {
        return this.paginateWaiting(this.formattedSessionListWarning, this.pageSizeWaitingWarning, this.pageNumberWaitingWarning);
    }

    /**
     * check for warning error
     *
     * @returns {boolean}
     */
    hasErrorsWarning(): boolean
    {
        return this.getFilteredSourceWaitingWarnings().filter(i => i.hasError || i.hasUpdate && this.validateForFormValues(i.formValue)).length > 0;
    }

    /*---------------------------------------------------------*/

    /**
     * on page change
     *
     * @param {number} page
     */
    onPaginateChangeWaiting(page: number): void
    {
        this.pageNumberWaiting = page;
    }

    /**
     * get submission waiting ist
     *
     * @returns {Array<WaitingItems>}
     */
    getFilteredSourceWaiting(): Array<WaitingItems>
    {
        // ignore holidays from success list
        return this.paginateWaiting(this.formattedSessionList.filter(i => !i.hasSessionCompleted), this.pageSizeWaiting, this.pageNumberWaiting);
    }

    /**
     * check if submit button enabled
     *
     * @returns {boolean}
     */
    enableSubmitButton(): boolean
    {
        return this.formattedSessionList.filter(i => !i.hasSessionCompleted).length > 0;
    }

    /*---------------------------------------------------------*/
    
    /**
     * build submission waiting list
     *
     */
    buildListView(): void
    {
        // reset
        this.formattedSessionListWarning = [];
        this.formattedSessionList = [];

        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.calendarWeek).endOf('isoWeek'))

        for (const row of this.sessionList)
        {
            const list: Array<SessionSubmissionItem> = [];

            if (!row.is_no_care)
            {
                // ignore if bookings is empty
                if (_.isEmpty(row.bookings))
                {
                    continue;
                }

                const sessionHasCasual = row.enrolment_routine.filter((i: { is_casual: boolean; }) => i.is_casual).length > 0;
    
                for (const item of dateRange) 
                {
                    if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
                    {
                        continue;
                    }
    
                    const bookings = this.buildSessionListViewItem(row, sessionHasCasual, item);

                    list.push({
                        id: uuid.v4(),
                        date: item.format('YYYY-MM-DD'),
                        day: _.capitalize(item.format('dddd')),
                        dateObject: item,
                        bookings: bookings,
                    });
                }
                
                // ignore if already submitted
                if (this.checkIfSessionCompleted([].concat.apply([], list.map(i => i.bookings)), row.selected))
                {
                    continue;
                }
            }

            // ui list
            const formattedList: WaitingItems = {
                id: row.id,
                child: row.child,
                enrolmentId: row.enrolment_id,
                enrolmentRef: row.enrolment_ref,
                enrolmentSessionType: row.enrolment_session_type,
                sessionRoutine: row.enrolment_routine,
                selectedSessionDates: row.selected,
                showDetails: false,
                items: list,
                hasError: list.filter(i => i.bookings.filter(b => b.hasSessionError).length > 0).length > 0,
                hasUpdate: list.filter(i => i.bookings.filter(b => b.hasSessionUpdate).length > 0).length > 0,
                hasSessionCompleted: !row.is_no_care ? this.checkIfSessionCompleted([].concat.apply([], list.map(i => i.bookings)), row.selected) : false,
                noCareProvided: row.is_no_care,
                preSchoolStatus: row.pre_school_status,
                formValue: {
                    action: row.is_no_care ? Object.keys(this.dependActions)[3] : Object.keys(this.dependActions)[(list.filter(i => i.bookings.filter(b => b.hasSessionUpdate).length > 0).length > 0) ? 1 : 0],
                    change_reason: null,
                    reason_late_change: null,
                    reason_no_change: null
                }
            };

            (!formattedList.noCareProvided && (formattedList.hasError || (formattedList.hasUpdate && this.validateForFormValues(formattedList.formValue)))) 
                ? this.formattedSessionListWarning.push(formattedList) 
                : this.formattedSessionList.push(formattedList);
        }
    }

    /**
     * build list item
     */
    buildSessionListViewItem(sessionItem: any, sessionHasCasual: boolean, dateObj: any): any
    {
        const bookings = sessionItem.bookings.filter((i: { date: any; }) => i.date === dateObj.format('YYYY-MM-DD'));

        for (const booking of bookings)
        {
            booking.setSessionRoutineStatus((booking.isCasual && sessionHasCasual) || (sessionItem.enrolment_routine.filter((i: { day: number; }) => i.day === dateObj.day()).length > 0));
            
            // get already submitted sessions
            booking.setSessionUpdatedStatus(
                !_.isEmpty(sessionItem.selected) && 
                ((booking.attendance && booking.attendance.sessionSubmitted) || sessionItem.selected.filter((i: string) => (booking.attendance && booking.attendance.sessionSubmitted) && i === booking.date).length > 0)
            );

            // check for new updates
            booking.setHasSessionUpdateStatus(
                !booking.isHoliday() && !_.isEmpty(sessionItem.selected) && (_.indexOf(sessionItem.selected, booking.date) < 0 || !booking.sessionUpdated)
            );
            
            // set disable booking
            booking.isDisabled = _.isNull(booking.attendance)
                || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime))
                || booking.isHoliday();

            // auto select already updated once
            booking.isSelected = booking.sessionUpdated;
            
            // check for errors
            booking.hasSessionError = !booking.isHoliday() && (_.isNull(booking.attendance) || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime)));
        }

        return bookings;
    }

    /**
     * map session dates
     *
     * @param {Array<any>} list
     * @returns {*}
     */
    mapSessionRoutineDay(list: Array<any>): any
    {
        const days = _.filter(list.map(item => this._commonService.getWeekDays().find(i => i['index'] === +item.day && !item.is_casual)));

        /*(!_.isEmpty(days) && list.filter(i => i.is_casual).length > 0) 
            ? days.push({ index: 8, name: `Casual (${list.filter(i => i.is_casual).length})` })
            : days.push({ index: 8, name: 'Casual Only' });*/

        if (_.isEmpty(days)) days.push({ index: 8, name: 'Casual Only' });

        return _.isEmpty(days) ? [] : _.uniq(_.sortBy(days, ['index']).map(i => i['name']));
    }

    /**
     * validate session report form values
     *
     * @param {*} value
     * @returns {*}
     */
    validateForFormValues(value: any): any
    {
        return (value.action === 'VARY' && _.isNull(value.change_reason)) ||
            (value.action === 'VARY' && _.isNull(value.change_reason) && DateTimeHelper.now().diff(DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek'), 'days') >= 28 && _.isNull(value.reason_late_change)) ||
            (value.action === 'NOCHG' && _.isNull(value.reason_no_change));
    }

    /**
     * check if session was complete
     *
     * @param {*} row
     * @returns {boolean}
     */
    checkIfSessionCompleted(bookings: Booking[], selectedDates: Array<string>): boolean
    {
        const submitted = bookings.filter((b: Booking) => !b.isHoliday() && !b.hasSessionError && (b.attendance && b.attendance.sessionSubmitted)).map((i: Booking) => i.date);
        const notSubmitted = bookings.filter((b: Booking) => !b.isHoliday() && !b.hasSessionError && (b.attendance && !b.attendance.sessionSubmitted)).map((i: Booking) => i.date);

        return (_.isEmpty(submitted) || _.isEmpty(selectedDates) || notSubmitted.length > 0) ? false : _.isEmpty(_.xor(submitted, selectedDates));
    }

    /**
     * get waiting submission summary info
     *
     * @returns {{ total: number, valid: number, error: number }}
     */
    getWaitingSessionSummary(): { total: number, valid: number, error: number }
    {
        return {
            total: this.formattedSessionList.filter(i => !i.hasSessionCompleted).length + this.formattedSessionListWarning.length,
            valid: this.formattedSessionList.filter(i => !i.hasSessionCompleted).length,
            error: this.formattedSessionListWarning.length
        }
    }

    /**
     * get action field label
     *
     * @param {string} value
     * @returns {string}
     */
    getActionLabel(value: string): string
    {
        return this.dependActions[value];
    }

    /**
     * view session attendance data
     *
     * @param {MouseEvent} e
     * @param {WaitingItems} item
     */
    viewSessionsDialog(e: MouseEvent, item: WaitingItems): void
    {
        e.preventDefault();
        
        this.dialogRef = this._matDialog
            .open(BulkSubmissionsManageSessionsComponent,
            {
                panelClass: 'bulk-submissions-manage-sessions-dialog',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    calendar_week: this.calendarWeek,
                    submission_actions: this.dependActions,
                    submission_change_reasons: this.dependChangeReason,
                    response: item
                }
            });
    }

    /**
     * set update session form values
     *
     * @param {MouseEvent} e
     * @param {WaitingItems} item
     * @param {boolean} [isWarningList=true]
     */
    setVaryValues(e: MouseEvent, item: WaitingItems, isWarningList: boolean = true): void
    {
        e.preventDefault();

        this.setUpdateValueModal = this._modalService
            .create({
                nzTitle: 'Set Update Values',
                nzContent: BulkSubmissionsSetUpdateValuesComponent,
                nzMaskClosable: false,
                nzComponentParams: {
                    item: item,
                    calendarWeek: this.calendarWeek,
                    dependActions: this.dependActions,
                    dependChangeReason: this.dependChangeReason,
                    sessionUpdatesFound: item.hasUpdate
                },
                nzWrapClassName: 'bulk-submission-set-update-values-modal',
                nzFooter: [
                    {
                        label: 'SAVE',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.submissionForm.valid),
                        onClick: componentInstance =>
                        {
                            if (isWarningList)
                            {
                                // update ui
                                const warningIndex = this.formattedSessionListWarning.findIndex(i => i.id === item.id);
                                
                                if (warningIndex > -1)
                                {
                                    this.formattedSessionListWarning[warningIndex].formValue = componentInstance.getValues();
                                    this.formattedSessionListWarning[warningIndex].hasSessionCompleted = this.checkIfSessionCompleted([].concat.apply([], item.items.map(i => i.bookings)), item.selectedSessionDates);

                                    setTimeout(() => this.transformValidSession(this.formattedSessionListWarning[warningIndex]), 50);
                                }
                            }
                            else
                            {
                                this.formattedSessionList.find(i => i.id === item.id).formValue =  componentInstance.getValues();
                            }
                            
                            this.setUpdateValueModal.destroy();
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.setUpdateValueModal.destroy()
                    }
                ]
            });
    }

    /**
     * move valid session from warning list to ready to submit list
     *
     * @param {WaitingItems} item
     */
    transformValidSession(session: WaitingItems): void
    {
        try 
        {
            if (typeof session !== 'undefined' && (!session.hasError || (session.hasUpdate && this.validateForFormValues(session.formValue))))
            {
                this.formattedSessionList.push(session);

                _.remove(this.formattedSessionListWarning, ['id', session.id]);
            }
        } 
        catch (error) 
        {
            throw error;
        }
    }

    /**
     * get bulk submission values
     *
     * @returns {*}
     */
    getSubmissionValues(): any
    {
        const sendItems = [];

        for (const session of this.formattedSessionList.filter(i => !i.hasSessionCompleted))
        {
            const sessionsList: SubmissionItem[] = [];

            for (const item of [].concat.apply([], session.items.map(i => i.bookings)) as Booking[])
            {
                if (item.isDisabled && !item.sessionUpdated)
                {
                    continue;
                }

                const _session: SubmissionItem = {
                    date: item.date,
                    startTime: DateTimeHelper.convertMinTo24HourString(item.sessionStart),
                    endTime: DateTimeHelper.convertMinTo24HourString(item.sessionEnd),
                    sessionFeeDescription: 'Fee Applied',
                    isChildAbsent: item.isAbsent(),
                    absenceReason: item.absenceNoteCode === 'NONE' ? '' : item.absenceNoteCode,
                    absenceDocumentHeld: (item.isAbsent() && item.isAbsentDocumentHeld),
                    amountCharged: parseFloat(item.price).toFixed(2),
                    sessionUnitOfMeasure: item.fee.frequency,
                    isPreSchoolProgram: session.preSchoolStatus,
                    Attendances: [],
                    bookingId: item.id,
                    isNoCareProvided: false
                };

                if (!item.isAbsent())
                {
                    _session.Attendances = [
                        {
                            timeIn: DateTimeHelper.convertMinTo24HourString(item.attendance.checkInTime),
                            timeOut: DateTimeHelper.convertMinTo24HourString(item.attendance.checkOutTime)
                        }
                    ];    
                }

                sessionsList.push(_session);
            }

            // ignore empty sessions
            if(!session.noCareProvided && _.isEmpty(sessionsList))
            {
                continue;
            }

            sendItems.push({
                child: session.child.id,
                enrol_id: session.enrolmentRef,
                start_date: DateTimeHelper.getUtcDate(DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek')),
                end_date: DateTimeHelper.getUtcDate(DateTimeHelper.parseMoment(this.calendarWeek).endOf('isoWeek')),
                report_date: DateTimeHelper.getUtcDate(DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek')),
                action: session.formValue.action,
                change_reason: session.formValue.change_reason,
                reason_late_change: session.formValue.reason_late_change,
                reason_no_change: session.formValue.reason_no_change,
                sessions: sessionsList,
                is_no_care_provided: session.noCareProvided
            });
        }

        return sendItems;
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    submitSessions(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.buttonLoader)
        {
            return;
        }

        const sendObj = this.getSubmissionValues();

        this._logger.debug('[submit bulk session report]', sendObj);

        if (sendObj.filter((i: { is_no_care_provided: boolean; }) => i.is_no_care_provided).length < 1 
            && sendObj.filter((i: { sessions: any; }) => _.isEmpty(i.sessions)).length === sendObj.length)
        {
            setTimeout(() => this._notification.displaySnackBar('Session reports has empty sessions', NotifyType.ERROR), 50);

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
                        this.buttonLoader = true;
                
                        this._bulkSessionSubmissionService
                            .bulkSessionSubmission({ sessions: sendObj })
                            .pipe(
                                takeUntil(this._unsubscribeAll),
                                finalize(() => this.buttonLoader = false)
                            )
                            .subscribe(
                                message =>
                                {
                                    if ( !message )
                                    {
                                        return;
                                    }
                
                                    this._bulkSessionSubmissionService.onSubmissionUpdated.next(true);
                    
                                    this._notification.clearSnackBar();
                    
                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                                },
                                error =>
                                {
                                    throw error;
                                },
                                () =>
                                {
                                    this._logger.debug('ðŸ˜€ all good. ðŸº');
                                }
                            );
                    }
                }
            );
    }
}
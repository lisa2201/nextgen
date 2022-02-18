import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BulkSessionSubmissionService } from '../../../services/bulk-session-submission.service';

import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NgProgress, NgProgressRef } from 'ngx-progressbar';

import { SessionSubmissionItem } from 'app/main/modules/child/session-submission/dialogs/add-submission-report/add-submission-report.component';
import { SessionSubmission } from 'app/main/modules/child/session-submission/session-submission.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';

export interface SessionSummaryList {
    id: string;
    week: any;
    submissions: Array<SessionSubmission>;
    items: Array<SessionSubmissionItem>;
    selected: boolean;
    submitted: {
        total: number,
        valid: number,
        error: number
    },
    waiting: {
        total: number,
        valid: number,
        error: number
    }
}

@Component({
    selector: 'session-summary-view-sidebar',
    templateUrl: './session-summary-view.component.html',
    styleUrls: ['./session-summary-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SessionSummaryViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    calendarInput: FormControl;
    yearSelection: boolean

    list: any;
    formattedList: Array<SessionSummaryList>;

    dependActions: Array<any>;
    dependChangeReason: Array<any>;

    hideWeekEnd: boolean;
    viewLoading: boolean;

    progressRef: NgProgressRef;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _bulkSessionSubmissionService: BulkSessionSubmissionService,
        private _ngProgress: NgProgress
    )
    {
        // set default values
        this.calendarInput = new FormControl(null, []);
        this.yearSelection = false;
        this.list = [];
        this.formattedList = [];
        this.dependActions = [];
        this.dependChangeReason = [];
        this.hideWeekEnd = true;
        this.viewLoading = false;
        this.progressRef = this._ngProgress.ref('sessionSummaryProgress');

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
        this._logger.debug('session summary view !!!');

        // Subscribe to calendar value changes
        this.calendarInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                distinctUntilChanged(),
            )
            .subscribe(value =>
            {   
                this.formattedList = [];

                if (!value) return;
                          
                this.getSummaryList();
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.progressRef.destroy();

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
     * update loader status
     *
     * @param {*} value
     */
    updateLoaderStatus(value: boolean): void
    {
        this.viewLoading = value;
    }

    /**
     * switch calendar view
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    toggleCalenderView(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.viewLoading)
        {
            return;
        }

        this.yearSelection = !this.yearSelection;

        this.calendarInput.patchValue(null, { emitEvent: false });
    }

    /**
     * get summary info
     *
     */
    getSummaryList(): void
    {
        this.progressRef.start();

        this._bulkSessionSubmissionService
            .getSessionSummaryReport({
                weeks: DateTimeHelper.getWeeksInMonth(this.calendarInput.value, this.yearSelection)
            })
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.progressRef.complete(), 200))
            )
            .subscribe(
                response => 
                {
                    if (_.isEmpty(response))
                    {
                        return;
                    }

                    this.list = [...response.list];
                    this.dependActions = {...response.actions};
                    this.dependChangeReason = {...response.reason_for_change};

                    setTimeout(() => this.buildSummaryList(), 100);
                },
                error => 
                {
                    throw error;
                }
            );
    }

    /**
     * build summary list
     *
     */
    buildSummaryList(): void
    {
        // reset
        this.formattedList = [];

        for (const object of this.list)
        {
            const finalList = [];

            const week = { ...object.week, number: DateTimeHelper.parseMoment(object.week.start).isoWeek() };

            const dateRange = DateTimeHelper.getDateRange(
                DateTimeHelper.parseMoment(object.week.start),
                DateTimeHelper.parseMoment(object.week.end))

            for (const row of object.items)
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

                const formattedList = {
                    id: row.id,
                    child: row.child,
                    selectedSessionDates: row.selected,
                    items: list,
                    hasError: list.filter(i => i.bookings.filter(b => b.hasSessionError).length > 0).length > 0,
                    hasUpdate: list.filter(i => i.bookings.filter(b => b.hasSessionUpdate).length > 0).length > 0,
                    hasSessionCompleted: !row.is_no_care ? this.checkIfSessionCompleted([].concat.apply([], list.map(i => i.bookings)), row.selected) : false,
                    noCareProvided: row.is_no_care,
                    formValue: {
                        action: row.is_no_care ? Object.keys(this.dependActions)[3] : Object.keys(this.dependActions)[(list.filter(i => i.bookings.filter(b => b.hasSessionUpdate).length > 0).length > 0) ? 1 : 0],
                        change_reason: null,
                        reason_late_change: null,
                        reason_no_change: null
                    },
                    isWaiting: false
                };

                formattedList.isWaiting = (!formattedList.noCareProvided && (formattedList.hasError || (formattedList.hasUpdate && this.validateForFormValues(formattedList.formValue, object.week.start))));

                finalList.push(formattedList);
            }

            this.formattedList.push({
                id: uuid.v4(),
                week: week,
                submissions: object.submissions,
                items: finalList,
                selected: false,
                submitted: {
                    total: object.submissions.length,
                    valid: object.submissions.filter((i: { hasError: () => boolean; }) => !i.hasError()).length,
                    error: object.submissions.filter((i: { hasError: () => boolean; }) => i.hasError()).length
                },
                waiting: {
                    total: finalList.filter(i => !i.isWaiting && !i.hasSessionCompleted).length + finalList.filter(i => i.isWaiting).length,
                    valid: finalList.filter(i => !i.isWaiting && !i.hasSessionCompleted).length,
                    error: finalList.filter(i => i.isWaiting).length
                }
            });
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

            // check for errors
            booking.hasSessionError = !booking.isHoliday() && (_.isNull(booking.attendance) || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime)));
        }

        return bookings;
    }

    /**
     * validate session report form values
     *
     * @param {*} value
     * @returns {*}
     */
    validateForFormValues(value: any, weekStart: string): any
    {
        return (value.action === 'VARY' && _.isNull(value.change_reason)) ||
            (value.action === 'VARY' && _.isNull(value.change_reason) && DateTimeHelper.now().diff(DateTimeHelper.parseMoment(weekStart).startOf('isoWeek'), 'days') >= 28 && _.isNull(value.reason_late_change)) ||
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
     * reset selected week
     *
     */
    resetSelectedWeek(): void
    {
        this.formattedList.forEach(i => 
        {
            i.selected = false;
        })
    }

    /**
     * select week
     *
     * @param {MouseEvent} e
     * @param {SessionSummaryList} item
     * @returns {void}
     */
    toggleWeek(e: MouseEvent, item: SessionSummaryList): void
    {
        e.preventDefault();

        if (item.selected || this.viewLoading)
        {
            return;
        }

        this.resetSelectedWeek();

        this.formattedList.find(i => i.id === item.id).selected = !this.formattedList.find(i => i.id === item.id).selected;
    
        this._bulkSessionSubmissionService.onSummeryViewWeekSelected.next(item);
    }

}

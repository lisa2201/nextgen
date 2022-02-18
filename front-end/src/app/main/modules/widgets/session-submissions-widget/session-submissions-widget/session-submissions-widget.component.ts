import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, Input, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { takeUntil, finalize, distinctUntilChanged, skip, startWith } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildSessionSubmissionService } from 'app/main/modules/child/session-submission/services/session-submission.service';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';
import { AuthService } from 'app/shared/service/auth.service';

import { AuthClient } from 'app/shared/model/authClient';
import { SessionSubmissionItem } from 'app/main/modules/child/session-submission/dialogs/add-submission-report/add-submission-report.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'session-submissions-widget',
    templateUrl: './session-submissions-widget.component.html',
    styleUrls: ['./session-submissions-widget.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SessionSubmissionsWidgetComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    sessionList: Array<any>;
    isSiteManager: boolean;
    widgetLoader: boolean;
    calendarWeek: FormControl;
    dependActions: Array<any>;
    hideWeekEnd: boolean;

    @Input() selectedBranch: string;

    @ViewChild('weekPicker')
    weekCalenderInput: ElementRef;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     * @param {ChildSessionSubmissionService} _sessionSubmissionService
     * @param {Router} _router
     * @param {DashboardService} _dashboardService
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _sessionSubmissionService: ChildSessionSubmissionService,
        private _router: Router,
        private _dashboardService: DashboardService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.widgetLoader = false;
        this.isSiteManager = false;
        this.hideWeekEnd = true;
        this.calendarWeek = new FormControl(DateTimeHelper.now().toDate());
        this.dependActions = [];
        this.sessionList = [];

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
        this._logger.debug('widgets - session submission !!!', this.selectedBranch);

        this.isSiteManager = this._authService.isOwnerPath();

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
                if (_.isNull(value))
                {
                    return;    
                }

                this.updateSessionSubmissionWidget();
            });

        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.updateSessionSubmissionWidget(), 250);
            });
    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.updateSessionSubmissionWidget(), 250);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * show month view selector
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    toggleCalendar(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.widgetLoader)
        {
            return;
        }

        (<HTMLElement> (<HTMLElement> this.weekCalenderInput.nativeElement).querySelector('.ant-picker-input')).click();
    }
    
    /**
     * get bulk session submission data
     */
    updateSessionSubmissionWidget(): void
    {
        this.widgetLoader = true;

        this._sessionSubmissionService
            .getSessionSubmissionSummary(
                this._authService.isOwner() ? this.selectedBranch : null,
                DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly),
                DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly)
            )
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                res => 
                {
                    this.sessionList = res.list;
                    this.dependActions = res.actions;

                    setTimeout(() => this.buildListView(), 50);
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * build submission waiting list
     *
     */
    buildListView(): void
    {
        const dateRange = DateTimeHelper.getDateRange(
            DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek'),
            DateTimeHelper.parseMoment(this.calendarWeek.value).endOf('isoWeek'))

        for (const row of this.sessionList)
        {
            const list: Array<SessionSubmissionItem> = [];

            for (const item of dateRange) 
            {
                if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
                {
                    continue;
                }

                const bookings = this.buildSessionListViewItem(row, item);

                list.push({
                    id: uuid.v4(),
                    date: item.format('YYYY-MM-DD'),
                    day: _.capitalize(item.format('dddd')),
                    dateObject: item,
                    bookings: bookings,
                });
            }

            // add attributes to original list
            this.sessionList[this.sessionList.findIndex(i => i.id === row.id)]['form_values'] = {
                action: Object.keys(this.dependActions)[(list.filter(i => i.bookings.filter(b => b.hasSessionUpdate).length > 0).length > 0) ? 1 : 0],
                change_reason: null,
                reason_late_change: null,
                reason_no_change: null
            }

            this.sessionList[this.sessionList.findIndex(i => i.id === row.id)]['has_error'] = list.filter(i => i.bookings.filter(b => b.hasSessionError).length > 0).length > 0;
            this.sessionList[this.sessionList.findIndex(i => i.id === row.id)]['has_update'] = list.filter(i => i.bookings.filter(b => b.hasSessionUpdate).length > 0).length > 0;
        }
    }

    /**
     * build list item
     */
    buildSessionListViewItem(sessionItem: any, dateObj: any): any
    {
        const bookings = sessionItem.bookings.filter((i: { date: any; }) => i.date === dateObj.format('YYYY-MM-DD'));

        for (const booking of bookings)
        {
            // get already submitted sessions
            booking.setSessionUpdatedStatus(
                !_.isEmpty(sessionItem.selected) && 
                ((booking.attendance && booking.attendance.sessionSubmitted) || sessionItem.selected.filter((i: string) => (booking.attendance && booking.attendance.sessionSubmitted) && i === booking.date).length > 0)
            );

            // check for new updates
            booking.setHasSessionUpdateStatus(
                !booking.isHoliday() && !_.isEmpty(sessionItem.selected) && (_.indexOf(sessionItem.selected, booking.date) < 0 || !booking.sessionUpdated)
            );
            
            booking.hasSessionError = !booking.isHoliday() && (_.isNull(booking.attendance) || (booking.attendance && booking.attendance.type === '0' && _.isNull(booking.attendance.checkOutTime)));

            // update session list
            this.sessionList.find(i => i.id === sessionItem.id).bookings[booking.index] = booking;
        }

        return bookings;
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
            (value.action === 'VARY' && _.isNull(value.change_reason) && DateTimeHelper.now().diff(DateTimeHelper.parseMoment(this.calendarWeek.value).startOf('isoWeek'), 'days') >= 28 && _.isNull(value.reason_late_change)) ||
            (value.action === 'NOCHG' && _.isNull(value.reason_no_change));
    }

    /**
     * get session submission errors
     *
     * @returns {*}
     */
    getErrorSessions(): any
    {
        return this.sessionList.filter(i => i.has_error || i.has_update && this.validateForFormValues(i.form_values));
    }

    /**
     * get waiting submission summary info
     *
     * @returns {{ total: number, valid: number, error: number }}
     */
    getWaitingSessionSummary(): { total: number, valid: number, error: number }
    {
        return {
            total: this.sessionList.length,
            valid: this.sessionList.length - this.getErrorSessions().length,
            error: this.getErrorSessions().length
        }
    }

    /**
     * navigate to bulk session submission page
     *
     * @returns {void}
     */
    navigate(e: MouseEvent): void
    {
        e.preventDefault();

        if(!this._authService.isOwner()) 
        {
            this._router.navigate(['bulk-operations/session-submissions']);
        }
    }
 
}

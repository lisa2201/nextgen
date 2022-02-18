import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BulkSessionSubmissionService } from '../services/bulk-session-submission.service';
import { AuthService } from 'app/shared/service/auth.service';

import { AuthClient } from 'app/shared/model/authClient';
import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'bulk-session-submission-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BulkSubmissionListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    sessions: { sessionList: Array<any>, dependActions: Array<any>, dependChangeReason: Array<any> };
    submissions: Array<any>;
    dependActions: Array<any>;
    dependChangeReason: Array<any>;

    calendarWeek: any;
    listViewLoading: boolean;
    tabSelected: number;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _bulkSessionSubmissionService: BulkSessionSubmissionService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.submissions = [];
        this.sessions = {
            sessionList: [],
            dependActions: [],
            dependChangeReason: []
        };
        this.dependActions = [];
        this.dependChangeReason = [];

        this.listViewLoading = false;
        this.calendarWeek = null;
        this.tabSelected = 0;

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
        this._logger.debug('bulk session submission - list view !!!');

        // Subscribe to booking changes
        this._bulkSessionSubmissionService
            .onSessionListChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => 
            {
                this._logger.debug('[session submission - list view]', data);

                this.reset();

                if (_.isEmpty(data))
                {
                    return;
                }

                setTimeout(() => 
                {
                    this.submissions = data.submitted;
    
                    this._bulkSessionSubmissionService.onSubmissionsChanged.next(this.submissions);
    
                    this.sessions = {
                        sessionList: data.list,
                        dependActions: data.actions,
                        dependChangeReason: data.reason_for_change,
                    };
    
                    this._bulkSessionSubmissionService.onSessionChanged.next(this.sessions);
                }, 0);
            });

        // Subscribe to view loader changes
        this._bulkSessionSubmissionService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.listViewLoading = value);

        // Subscribe to reset list view changes
        this._bulkSessionSubmissionService
            .onResetListView
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.reset());

        // Subscribe to calendar week changes
        this._bulkSessionSubmissionService
            .onCalendarWeekChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.calendarWeek = value);
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
     * get selected week
     *
     * @returns {{ start :string, end: string }}
     */
    getSelectedWeek(): { start :string, end: string }
    {
        if(!this.calendarWeek)
        {
            return null;
        }

        return {
            start: DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek').format(AppConst.dateTimeFormats.longDateFormat), 
            end: DateTimeHelper.parseMoment(this.calendarWeek).endOf('isoWeek').format(AppConst.dateTimeFormats.longDateFormat) 
        }
    }

    onTabChange(index: number): void
    {
        this.tabSelected = index;
    }

    reset(): void
    {
        this.submissions = [];

        this.sessions = {
            sessionList: [],
            dependActions: [],
            dependChangeReason: []
        };
    }

    // get waitingListCount(): any
    // {
    //     return this.sessions.sessionList.filter(row => !_.isEmpty(_.xor(row.bookings.filter((b: Booking) => !b.isHoliday() && (b.attendance && b.attendance.sessionSubmitted)).map((i: Booking) => i.date), row.selected)))
    // }

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
     * get session submission errors
     *
     * @returns {*}
     */
    get errorSessions(): any
    {
        return this.sessions.sessionList.filter(i => i.has_error || i.has_update && this.validateForFormValues(i.form_values));
    }

    
}

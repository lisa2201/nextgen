import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BulkSessionSubmissionService } from '../../../services/bulk-session-submission.service';
import { AuthService } from 'app/shared/service/auth.service';

import { SessionSubmission } from 'app/main/modules/child/session-submission/session-submission.model';
import { AuthClient } from 'app/shared/model/authClient';

@Component({
    selector: 'bulk-session-submitted-tab',
    templateUrl: './submitted-tab.component.html',
    styleUrls: ['./submitted-tab.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BulkSubmissionSubmittedTabComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;

    submissions: Array<SessionSubmission>;
    submissionFilteredSource: Array<SessionSubmission>;
    pageSizeSubmission: number;
    pageNumberSubmission: number;

    hideWeekEnd: boolean;

    @Input() 
    calendarWeek: any;

    showOnlyErrors: boolean;

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
        this.submissionFilteredSource = [];
        this.pageSizeSubmission = 15;
        this.pageNumberSubmission = 1;

        this.hideWeekEnd = true;

        this.showOnlyErrors = false;

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
        this._logger.debug('session submission - tab submitted !!!');

        // Subscribe to submission changes
        this._bulkSessionSubmissionService
            .onSubmissionsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => this.submissions = data);

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

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * get paginate submission list
     *
     * @param {*} array
     * @param {number} pageSize
     * @param {number} pageNumber
     * @returns {*}
     */
    paginateSubmissions(array: any, pageSize: number, pageNumber: number): any
    {
        return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    }

    /**
     * on page change
     *
     * @param {number} page
     */
    onPaginateChangeSubmissions(page: number): void
    {
        this.pageNumberSubmission = page;

        this.submissionFilteredSource = this.paginateSubmissions(this.submissions, this.pageSizeSubmission, this.pageNumberSubmission);
    }

    /**
     * get session list
     *
     * @returns {Array<SessionSubmission>}
     */
    getFilteredSourceSubmissions(): Array<SessionSubmission>
    {
        return this.paginateSubmissions(this.showOnlyErrors ? this.submissions.filter(i => i.hasError()) : this.submissions, this.pageSizeSubmission, this.pageNumberSubmission);
    }

    /**
     * show & hide submitted sessions
     *
     * @param {MouseEvent} e
     */
    toggleSubmittedSessions(e: MouseEvent, item: SessionSubmission): void
    {
        e.preventDefault();

        const index = this.submissions.findIndex(i => i.id === item.id);

        if (index > -1)
        {
            this.submissions[index].showSubmittedSessions = !this.submissions[index].showSubmittedSessions; 
        }
    }

    /**
     * get submission summary info
     *
     * @returns {{ total: number, valid: number, error: number }}
     */
    getSubmittedSessionSummary(): { total: number, valid: number, error: number }
    {
        return {
            total: this.submissions.length,
            valid: this.submissions.filter(i => !i.hasError()).length,
            error: this.submissions.filter(i => i.hasError()).length
        }
    }

    /**
     * reset list view
     *
     */
    reset(): void
    {
        this.submissions = [];
        this.submissionFilteredSource = [];
    }

    /**
     * toggle between all and error view
     *
     * @param {MouseEvent} e
     */
    toggleView(e: MouseEvent): void
    {
        this.showOnlyErrors = !this.showOnlyErrors;
    }

}

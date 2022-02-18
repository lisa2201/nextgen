import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion } from 'ng-zorro-antd';

import { ChildSessionSubmissionService } from '../services/session-submission.service';

import { SessionSubmission } from '../session-submission.model';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

@Component({
    selector: 'session-submission-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SessionSubmissionListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    sessionList: SessionSubmission[];
    currentSession: SessionSubmission;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    paginationMeta: any;
    total: number;
    listViewLoading: boolean;
    disableScroll: boolean;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildSessionSubmissionService} _sessionService
     */
    constructor(
        private _logger: NGXLogger,
        private _sessionService: ChildSessionSubmissionService
    )
    {
        // set default values
        this.total = 0;
        this.pageSizeChanger = true;
        this.listViewLoading = false;
        this.disableScroll = false;

        this.pageSize = this._sessionService.defaultPageSize;
        this.pageIndex = this._sessionService.defaultPageIndex;
        this.pageSizeOptions = this._sessionService.defaultPageSizeOptions;
        this.paginationMeta = null;
        
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
        this._logger.debug('child session submission - detail view !!!');

        // Subscribe to session list changes
        this._sessionService
            .onChildSessionSubmissionChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[sessions]', response);

                this.sessionList = response.items;
                this.total = response.totalDisplay;
                this.paginationMeta = response.meta;

                // set previously selected session
                this.setLastSelectedChild();

                this.updateListScroll();
            });
        
        // Subscribe to update current session on changes
        this._sessionService
            .onCurrentSessionChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(session =>
            {
                this._logger.debug('[list view - current session]', session);

                this.currentSession = (!session) ? null : session;

                this.readSessionSubmission();
            });
        
        // Subscribe to view loader changes
        this._sessionService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.listViewLoading = value);
        
        // Subscribe to filter changes
        this._sessionService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) =>
            {
                // reset page index
                this.pageIndex = this._sessionService.defaultPageIndex;
            });

        // Subscribe to detail view changes
        this._sessionService
            .onDetailViewItemUpdated
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(session => this.updateSessionList(session));
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
     * get current session 
     *
     * @param {MouseEvent} e
     * @param {string} id
     */
    getSession(e: MouseEvent, id: string): void
    {
        e.preventDefault();

        if (this.listViewLoading)
        {
            return;    
        }

        if (!this.currentSession || this.currentSession.id !== id)
        {
            this._sessionService.setCurrentSession(id);

            // trigger detail view scroll changes
            this._sessionService.onListViewItemChanged.next();
        }
    }

    /**
     * set previously selected session
     */
    setLastSelectedChild(): void
    {
        if (this._sessionService.currentSession)
        {
            setTimeout(() => this._sessionService.setCurrentSession(this._sessionService.currentSession.id));
        }
    }

    /**
     * update list view scroll
     */
    updateListScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    /**
     * next page
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    previousPage(e: MouseEvent): void
    {
        e.preventDefault();

        if (_.isNull(this.paginationMeta) || this.total === 0 || this.pageIndex === 1 || this.listViewLoading)
        {
            return;    
        }

        this.pageIndex -= 1;

        this._sessionService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * previous page
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    nextPage(e: MouseEvent): void
    {
        e.preventDefault();

        if (_.isNull(this.paginationMeta) || this.total === 0 || this.pageIndex === this.getLastIndex || this.listViewLoading)
        {
            return;    
        }

        this.pageIndex += 1;
    
        this._sessionService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * get lats page index
     *
     * @readonly
     * @type {number}
     */
    get getLastIndex(): number
    {
        return Math.ceil(this.total / this.pageSize);
    }

    /**
     * get session list
     * list update fix
     */
    get listSource(): SessionSubmission[]
    {
        return [...this.sessionList];
    }

    /**
     * update session list
     *
     * @param {SessionSubmission} session
     */
    updateSessionList(session: SessionSubmission): void
    {
        this.sessionList[this.sessionList.findIndex(i => i.id === this.currentSession.id)] = session;

        this._sessionService.updateSessionsList(this.sessionList);
    }

    /**
     * read submission data from api
     */
    readSessionSubmission(): void
    {
        if (!this.currentSession || (this.currentSession && !this.currentSession.canReadFromAPI()))
        {
            return;    
        }
        
        setTimeout(() =>
        {
            this.listViewLoading = true;
    
            this._sessionService
                .readSessionReport(this.currentSession.id)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => this.listViewLoading = false)
                )
                .subscribe(
                    response =>
                    {
                        this.updateSessionList(response);

                        this._sessionService.onListViewItemUpdated.next(response);
                    },
                    error =>
                    {
                        throw error;
                    }
                );
        }, 150);
    }
}

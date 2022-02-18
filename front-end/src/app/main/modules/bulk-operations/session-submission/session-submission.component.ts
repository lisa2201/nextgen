import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { startWith, distinctUntilChanged, skip } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';


import { BulkSessionSubmissionService } from './services/bulk-session-submission.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

import { Child } from '../../child/child.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';
import { SessionSubmission } from '../../child/session-submission/session-submission.model';

@Component({
    selector: 'bulk-session-submission',
    templateUrl: './session-submission.component.html',
    styleUrls: ['./session-submission.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BulkSessionSubmissionComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    private _sessionSummaryViewSidebarName = 'session-summary-sidebar';

    children: Child[];
    calendarWeek: FormControl;
    selectedChild: FormControl;
    buttonLoader: boolean;

    sessionList: Array<any>;
    submissions: Array<SessionSubmission>;

    eventWeekSelected: Subject<any>;

    listViewLoading: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _bulkSessionSubmissionService: BulkSessionSubmissionService,
        private _fuseSidebarService: FuseSidebarService
    )
    {
        // set default values
        this.calendarWeek = new FormControl(null, []); // DateTimeHelper.now().toDate();
        this.selectedChild =  new FormControl('0', []);
        this.buttonLoader = false;

        this.sessionList = [];
        this.submissions = [];

        this.listViewLoading = false;

        this.eventWeekSelected = new Subject<any>();

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
        this._logger.debug('bulk session submissions !!!');

        // Subscribe to depends changes
        this._bulkSessionSubmissionService
            .onDependChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[on depends change]', response);  
                
                this.children = response.children;
            });

        // Subscribe to booking changes
        this._bulkSessionSubmissionService
            .onSessionListChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data: any) => 
            {
                this.sessionList = data.list;
                this.submissions = data.submitted;
            });

        // Subscribe to view loader changes
        this._bulkSessionSubmissionService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.listViewLoading = value);

        // Subscribe to submission update changes
        this._bulkSessionSubmissionService
            .onSubmissionUpdated
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.getSessionList(this.calendarWeek.value));

        // Subscribe to submission summary view selection changes
        this._bulkSessionSubmissionService
            .onSummeryViewWeekSelected
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedChild.patchValue('0', { emitEvent: false });

                this.calendarWeek.setValue(DateTimeHelper.parseMoment(value.week.start).toDate());
            });

        // Subscribe to calendar value changes
        this.calendarWeek
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                startWith(this.calendarWeek),
                distinctUntilChanged(),
                skip(1)
            )
            .subscribe(value =>
            {            
                if (_.isNull(value) || this.listViewLoading)
                {
                    return;    
                }

                this._bulkSessionSubmissionService.resetTabListChange.next(true);

                this._bulkSessionSubmissionService.onCalendarWeekChanged.next(value);

                this.getSessionList(value);
            });

        this.selectedChild
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll),)
            .subscribe(value =>
            {       
                if(!this.calendarWeek.value || this.listViewLoading)
                {
                    return;
                }

                this._bulkSessionSubmissionService.resetTabListChange.next(true);

                this.getSessionList(this.calendarWeek.value, value !== '0' ? value : null);
            });
    }

    /**
     * Respond after initializes the component's views
     */
    ngAfterViewInit(): void 
    {
        setTimeout(() => 
        {
            this._fuseSidebarService
                .getSidebar(this._sessionSummaryViewSidebarName)
                .openedChanged
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(value => 
                {
                    // console.log(value)
                });
        }, 500);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.eventWeekSelected.unsubscribe();

        this._bulkSessionSubmissionService.unsubscribeOptions();

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

    disableReload(): boolean
    {
        return (this.sessionList.length === 0 && this.submissions.length === 0) || this.listViewLoading;
    }

    /**
     * check if side bar opened
     *
     * @returns {boolean}
     */
    isSidebarOpened(): boolean
    {
        return this._fuseSidebarService.getSidebar(this._sessionSummaryViewSidebarName) 
            ? this._fuseSidebarService.getSidebar(this._sessionSummaryViewSidebarName).opened 
            : false;
    }

    /**
     * Toggle session summary sidebar
     *
     * @param name
     */
    toggleSidebar(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.buttonLoader || this.listViewLoading)
        {
            return;
        }

        this._fuseSidebarService.getSidebar(this._sessionSummaryViewSidebarName).toggleOpen();
    }

    /**
     * disable future weeks
     */
    disabledFutureWeeks = (startValue: Date): boolean =>
    {
        return differenceInCalendarDays(startValue, DateTimeHelper.now().endOf('isoWeek').toDate()) > 0;
    }
    
    /**
     * get session data
     *
     * @param {*} week
     */
    getSessionList(week: any, childId: string = null): void
    {
        this._bulkSessionSubmissionService
            .getSessions({ 
                child: childId,
                start: DateTimeHelper.parseMoment(week).startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly), 
                end: DateTimeHelper.parseMoment(week).endOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly) 
            })
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                response => 
                {
                    if(_.isEmpty(response))
                    {
                        return;
                    }

                    this._bulkSessionSubmissionService.onSessionListChanged.next(response);
                },
                error => 
                {
                    this.reset();
                    
                    this._bulkSessionSubmissionService.onResetListView.next(true);

                    throw error;
                }
            );
    }

    /**
     * reset list data
     *
     */
    reset(): void
    {
        this.sessionList = [];

        this.submissions = [];
    }

    /**
     * reload view
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    reload(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.buttonLoader || this.listViewLoading)
        {
            return;
        }

        this.getSessionList(this.calendarWeek.value, this.selectedChild.value !== '0' ? this.selectedChild.value : null);
    }
}

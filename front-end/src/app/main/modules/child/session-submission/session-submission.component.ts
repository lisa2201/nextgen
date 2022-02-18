import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { ChildrenService } from '../services/children.service';
import { ChildSessionSubmissionService } from './services/session-submission.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Child } from '../child.model';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { SessionSubmission } from './session-submission.model';
import { browserRefresh } from 'app/app.component';

import { ChildAddSubmissionReportComponent } from './dialogs/add-submission-report/add-submission-report.component';
import { SessionSubmissionListViewComponent } from './list-view/list-view.component';
import {CommonService} from '../../../../shared/service/common.service';

@Component({
    selector: 'child-session-submission',
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
export class ChildSessionSubmissionComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    currentSession: SessionSubmission;
    buttonLoader: boolean;
    detailActionLoaderStatus: boolean;
    searchInput: FormControl;

    dialogRef: any;

    @ViewChild(SessionSubmissionListViewComponent)
    listComponent: SessionSubmissionListViewComponent;
    
    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {MatDialog} _matDialog
     * @param {ChildrenService} _childrenServices
     * @param {ChildSessionSubmissionService} _sessionService
     */
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _childrenServices: ChildrenService,
        private _sessionService: ChildSessionSubmissionService,
        private _childrenService: ChildrenService,
        private _commonService: CommonService
    )
    {
        // set default values
        this.buttonLoader = false;
        this.detailActionLoaderStatus = false;
        this.searchInput = new FormControl({ value: null, disabled: false });
        
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
        this._logger.debug('child session submission !!!');

        // Subscribe to child changes
        this._sessionService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) => 
            {
                this._logger.debug('[child session submission]', child);

                this.child = child;

                if (browserRefresh)
                {
                    this._childrenServices.setDefaultCurrentChild(this.child);
                }
            });
        
        // Subscribe to sessions list changes
        this._sessionService
            .onChildSessionSubmissionChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[sessions]', response);

                this.searchInput[(response.total < 1 || (response.filtered && response.totalDisplay < 1)) ? 'disable' : 'enable']({ emitEvent: false });

                // reset search
                if (response.total < 1 || (response.filtered && response.totalDisplay < 1)) { this.resetSearch(); }
            });

        // Subscribe to update current child on changes
        this._sessionService
            .onCurrentSessionChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(session =>
            {
                this._logger.debug('[child view - current session]', session);

                this.currentSession = (!session) ? null : session;
            });

        // Subscribe to detail action loader on changes
        this._sessionService
            .onDetailActionLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.detailActionLoaderStatus = value);

        // Subscribe to search input changes
        this.searchInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(searchText =>
            {
                this._logger.debug('[search change]', searchText);

                if (!_.isNull(searchText))
                {
                    this._sessionService.onSearchTextChanged.next(searchText);
                }
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        // reset service
        this._sessionService.unsubscribeOptions();

        // reset child service
        if (this._router.routerState.snapshot.url.indexOf('/manage-children') < 0)
        {
            this._childrenServices.unsubscribeOptions();
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
     * clear search
     *
     * @param {MouseEvent} e
     */
    clearSearch(e: MouseEvent): void
    {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.resetSearch(true);
    }

    /**
     * clear search and sort
     *
     * @param {boolean} [updateView=false]
     */
    resetSearch(updateView: boolean = false): void
    {
        // this.resetSort();

        this.searchInput.patchValue('', { emitEvent: false });

        if (updateView)
        {
            this._sessionService.onSearchTextChanged.next(this.searchInput.value);
        }
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    /**
     * check view loading
     *
     * @readonly
     * @type {boolean}
     */
    get isViewLoading(): boolean
    {
        return (typeof this.listComponent !== 'undefined') ? this.listComponent.listViewLoading : false;
    }

    /**
     * refresh session list
     *
     * @param {MouseEvent} e
     */
    refreshList(e: MouseEvent): void
    {
        e.preventDefault();

        if(this.isViewLoading || this.detailActionLoaderStatus)
        {
            return;
        }

        this._sessionService.resetCurrentSession();

        this._sessionService.onPaginationChanged.next({
            page: this._sessionService.defaultPageIndex,
            size: this._sessionService.defaultPageSize
        });
    }

    /**
     * open create session submission dialog
     *
     * @param {MouseEvent} e
     */
    createSessionSubmission(e: MouseEvent): void
    {
        e.preventDefault();

        if(this.isViewLoading || this.detailActionLoaderStatus)
        {
            return;
        }

        this.buttonLoader = true;

        this._sessionService
            .getDependency()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response)) { return; }

                    this.dialogRef = this._matDialog
                        .open(ChildAddSubmissionReportComponent,
                        {
                            panelClass: 'child-add-submission-report',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                child: this.child,
                                submission_actions: response.actions,
                                submission_change_reasons: response.reason_for_change,
                                enrolment_routine: response.enrolment_routine,
                                enrolment_id: response.enrolment_id,
                                enrolment_reference: response.enrolment_reference,
                                response: {}
                            }
                        });
                        
                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((message: string) =>
                        {   
                            if ( !message )
                            {
                                return;
                            }
            
                            this._notification.clearSnackBar();
            
                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                },
                error =>
                {
                    throw error;
                }
            );

    }

    /**
     * get child image
     *
     * @param {{ image: string; gender: string; }} item
     * @returns {string}
     */
    getChildProfileImage(item: { image: string; gender: string; }) : string
    {
        return item.image 
            ? this._commonService.getS3FullLinkforProfileImage(item.image)
            : `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`
    }
}

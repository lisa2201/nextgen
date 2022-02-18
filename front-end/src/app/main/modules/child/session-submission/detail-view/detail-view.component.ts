import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildSessionSubmissionService } from '../services/session-submission.service';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { SessionSubmission } from '../session-submission.model';
import { AuthClient } from 'app/shared/model/authClient';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { ChildWithdrawSubmissionReportComponent } from '../dialogs/withdraw-submission-report/withdraw-submission-report.component';
import { ChildResubmitSessionComponent } from '../dialogs/resubmit-session/resubmit-session.component';

@Component({
    selector: 'session-submission-detail-view',
    templateUrl: './detail-view.component.html',
    styleUrls: ['./detail-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SessionSubmissionDetailViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    session: SessionSubmission;
    client: AuthClient;

    viewMoreBasicDetails: boolean;
    confirmModal: NzModalRef;
    buttonLoader: boolean;
    dialogRef: any;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {ChildSessionSubmissionService} _sessionService
     * @param {AuthService} _authService
     * @param {MatDialog} _matDialog
     * @param {NotificationService} _notification
     */
    constructor(
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _sessionService: ChildSessionSubmissionService,
        private _authService: AuthService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _modalService: NzModalService
    )
    {
        // set default values
        this.client = this._authService.getClient();

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

        // Subscribe to update current child on changes
        this._sessionService
            .onCurrentSessionChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(session =>
            {
                this._logger.debug('[child detail - current session]', session);

                // set current child
                this.session = (!session) ? null : session;
            });

        // Subscribe to list view changes
        this._sessionService
            .onListViewItemChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() =>
            {
                // reset scroll position
                this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 100);
            });
        
        // Subscribe to list view item changes
        this._sessionService
            .onListViewItemUpdated
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((updatedSession: SessionSubmission) =>
            {
                this.session = null;

                this.session = updatedSession;
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
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
     * check if sessions available
     *
     * @readonly
     * @type {boolean}
     */
    get isSessionAvailable(): boolean
    {
        return this._sessionService.hasSessions();
    }

    /**
     * deselect current session
     *
     * @param {MouseEvent} [e=null]
     */
    deselectCurrentSession(e: MouseEvent = null): void
    {
        if (e) { e.preventDefault(); }

        this._sessionService.onCurrentSessionChanged.next(null);
    }

    /**
     * withdraw session submission
     *
     * @param {MouseEvent} e
     */
    withdraw(e: MouseEvent): void
    {
        e.preventDefault();

        this.buttonLoader = true;

        this._sessionService.onDetailActionLoaderChanged.next(true);

        this._sessionService
            .getWithdrawalDependency()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => 
                {
                    this.buttonLoader = false;

                    this._sessionService.onDetailActionLoaderChanged.next(false);
                }, 200))
            )
            .subscribe(
                response =>
                {
                    this.dialogRef = this._matDialog
                        .open(ChildWithdrawSubmissionReportComponent,
                        {
                            panelClass: 'child-withdraw-submission-report',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                session: this.session,
                                response: response
                            }
                        });
                        
                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((res: { item: SessionSubmission; message: string; }) =>
                        {   
                            if (_.isEmpty(res))
                            {
                                return;
                            }

                            this.session = res.item;

                            this._sessionService.onDetailViewItemUpdated.next(this.session);
            
                            this._notification.clearSnackBar();
            
                            setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
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
    resubmit(e: MouseEvent): void
    {
        e.preventDefault();

        this.buttonLoader = true;

        this._sessionService.onDetailActionLoaderChanged.next(true);

        const sendObj = { id: this.session.id };

        this._sessionService
            .getResubmitPreview(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => 
                {
                    this.buttonLoader = false;

                    this._sessionService.onDetailActionLoaderChanged.next(false);
                }, 200))
            )
            .subscribe(
                response =>
                {
                    if (!response.is_no_care && _.isEmpty(response.bookings))
                    {
                        setTimeout(() => this._notification.displaySnackBar('Sessions not available for this week', NotifyType.ERROR), 50);
                    }

                    this.dialogRef = this._matDialog
                        .open(ChildResubmitSessionComponent,
                        {
                            panelClass: 'child-resubmit-session',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                session: this.session,
                                response: response
                            }
                        });
                        
                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((message: string) =>
                        {   
                            if (_.isEmpty(message))
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
     * delete session submission
     *
     * @param {MouseEvent} e
     */
    delete(e: MouseEvent): void
    {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () =>
                    {
                        return new Promise((resolve, reject) =>
                        {
                            this._sessionService
                                .deleteSession(this.session.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message =>
                                    {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        this.deselectCurrentSession();
                                    },
                                    error =>
                                    {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }
}

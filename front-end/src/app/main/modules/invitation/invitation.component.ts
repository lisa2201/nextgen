import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { InvitationService } from './services/invitation.service';
import { CommonService } from 'app/shared/service/common.service';

import { AppConst } from 'app/shared/AppConst';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

import { InvitationAddOrEditDialogComponent } from './dialogs/new-or-edit/new-or-edit.component';
import { InvitationListViewComponent } from './list-view/list-view.component';
import { InvitationSingleNewOrEditComponent } from './dialogs/single-new-or-edit/single-new-or-edit.component';

@Component({
    selector: 'invitation',
    templateUrl: './invitation.component.html',
    styleUrls: ['./invitation.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InvitationComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    buttonLoader: boolean;
    dialogRef: any;
    isOwnerView: boolean;

    @ViewChild(InvitationListViewComponent)
    tableContentView: InvitationListViewComponent;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {AuthService} _authService
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {MatDialog} _matDialog
     * @param {InvitationService} _invitationService
     */
    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _invitationService: InvitationService,
        private _commonService: CommonService
    )
    {
        // Set default values
        this.buttonLoader = false;
        this.isOwnerView = this._authService.isOwner();

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
        this._logger.debug('invitation !!!');
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        // reset service
        this._invitationService.unsubscribeOptions();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    get listViewLoading(): boolean
    {
        return (typeof this.tableContentView !== 'undefined') ? this.tableContentView.tableLoading : false;
    }

    /**
     * Add new invitation item
     *
     * @param {MouseEvent} e
     * @param {string} [option=null]
     */
    addDialog(e: MouseEvent, option: string = null): void
    {
        e.preventDefault();

        if (this.buttonLoader || this.listViewLoading)
        {
            return;
        }

        this.buttonLoader = true;

        this._invitationService
            .getDependency()
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

                    const _component: any = this.isOwnerView ? InvitationAddOrEditDialogComponent : InvitationSingleNewOrEditComponent;
                    const _componentClass: any = this.isOwnerView ? 'invitation-new-or-edit-dialog' : 'invitation-single-new-or-edit-dialog';

                    this.dialogRef = this._matDialog
                        .open(_component,
                        {
                            panelClass: _componentClass,
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                has_owner_access: !_.isNull(option),
                                response: {
                                    depends: response
                                }
                            }
                        });

                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(message =>
                        {
                            if ( !message )
                            {
                                return;
                            }

                            this._notification.clearSnackBar();

                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                            // update view
                            this.tableContentView.onTableChange(true);
                        });
                }
            );
    }

    /**
     * Update content scroll
     */
    updateScroll(): void
    {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }
}

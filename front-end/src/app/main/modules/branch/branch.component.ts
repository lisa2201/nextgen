import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NotificationService } from 'app/shared/service/notification.service';
import { BranchService } from './services/branch.service';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';

import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { Branch } from './branch.model';

import { BranchAddDialogComponent } from './dialogs/new/new.component';

import { AppConst } from 'app/shared/AppConst';
import { ProviderSetupService } from '../account-manager/provider-setup/services/provider-setup.service';

@Component({
    selector: 'organization-branch-list',
    templateUrl: './branch.component.html',
    styleUrls: ['./branch.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BranchComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    branchList: Branch[];
    buttonLoader: boolean;
    hasActionButton: boolean;

    dialogRef: any;
    confirmModal: NzModalRef;

    updateButtonsTriggered: boolean;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {BranchService} _roleService
     * @param {MatDialog} _matDialog
     * @param {NzModalService} _modalService
     * @param {CommonService} _commonService
     * @param {AuthService} _authService
     */
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _branchService: BranchService,
        public _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _commonService: CommonService,
        private _authService: AuthService,
        private _providerService: ProviderSetupService
    )
    {
        // Set defaults
        this.buttonLoader = false;
        this.updateButtonsTriggered = false;
        this.hasActionButton = this._authService.canAccess(['AC2', 'AC3'], 'N03');

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
        this._logger.debug('branch !!!');

        // Subscribe to branch changes
        this._branchService
            .onBranchChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((branches: Branch[]) =>
            {
                this._logger.debug('[branches]', branches);

                this.branchList = branches;
            });

        // Subscribe to branch status changes
        this._branchService
            .onBranchStatusChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((res: any) =>
            {
                this._logger.debug('[branch update status]', res);

                this.branchList[res.position].setStatus(res.status);
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

        // Close all dialogs
        this._matDialog.closeAll();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Add new branch item
     */
    addDialog(e: MouseEvent): void
    {
        e.preventDefault();

        this.buttonLoader = true;

        Promise.all([
            this._commonService.getTimeZones(),
            this._commonService.getCountries(),
            this._branchService.getProviders(),
            this._branchService.getCCSInfo()
        ])
        .then(([timezones, countries, providers, ccs]: [any, any, any, any]) =>
        {
            setTimeout(() => this.buttonLoader = false, 200);

            /*let sortTzList = []
            _.forEach(timezones, (tz, i) => _.merge(sortTzList, tz.zones));
            sortTzList = _.sortBy(sortTzList, ['value'])*/

            this.dialogRef = this._matDialog
                .open(BranchAddDialogComponent,
                {
                    panelClass: 'branch-new-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        timezones: [],
                        countries: countries,
                        providers: providers,
                        ccs: ccs,
                        response: {}
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
                });
        });
    }

    /**
     * Edit role item
     *
     * @param {Branch} item
     * @param {MouseEvent} e
     */
    editDialog(item: Branch, e: MouseEvent): void
    {

    }

    /**
     * Delete branch item
     *
     * @param {Branch} item
     * @param {MouseEvent} e
     */
    delete(item: Branch, e: MouseEvent): void
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
                            this._branchService
                                .deleteBranch(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
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

    /**
     * Update branch status
     *
     * @param {Branch} item
     * @param {MouseEvent} e
     */
    updateStatus(item: Branch, index: number, e: MouseEvent): void
    {
        e.preventDefault();

        // prevent from multiple clicks
        if (this.updateButtonsTriggered)
        {
            return;
        }

        this.updateButtonsTriggered = true;

        item.statusLoading = true;

        const sendObj = {
            id: item.id,
            status: !item.status
        };

        this._branchService
            .updateStatus(sendObj, index)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => item.statusLoading = this.updateButtonsTriggered = false, 250))
            )
            .subscribe(
                message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                error =>
                {
                    throw error;
                }
            );
    }
}

import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/internal/operators/finalize';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject, forkJoin } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { MatDialog } from '@angular/material/dialog';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

import { PermissionService } from './services/permission.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Permission } from './permission.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';

import { UpdatePermissionGroupsComponent } from './modals/update-permission-groups/update-permission-groups.component';
import { PermissionListViewComponent } from './list-view/list-view.component';
import { UpdateOrganizationPermissionsComponent } from './dialogs/update-organization-permissions/update-organization-permissions.component';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

@Component({
    selector: 'permission',
    templateUrl: './permission.component.html',
    styleUrls: ['./permission.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PermissionComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    updates: any;
    buttonLoader: boolean;
    updateModal: NzModalRef;
    dialogRef: any;
    confirmModal: NzModalRef;

    @ViewChild(PermissionListViewComponent)
    listViewComponent: PermissionListViewComponent;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _permsService: PermissionService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
    )
    {
        // set default values
        this.updates = [];
        this.buttonLoader = false;

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
        this._logger.debug('permissions !!!');

        // Subscribe to resource changes
        this._permsService
            .onUpdatesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((items: any) => this.updates = items);

        // Subscribe to permission changes
        this._permsService
            .onPermissionsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((items: Permission[]) => setTimeout(() => this.updateScroll()));

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        if (this.updateModal)
        {
            this.updateModal.close();    
        }

        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }

        // reset service
        this._permsService.unsubscribeOptions();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * update page scroll
     */
    updateScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    /**
     * get errors from table
     *
     * @returns {boolean}
     */
    hasErrors(): boolean
    {
        return this.listViewComponent ? this.listViewComponent.hasError() : false; 
    }

    /**
     * show new updates
     *
     * @param {MouseEvent} e
     */
    showUpdates(e: MouseEvent): void
    {
        e.preventDefault();

        this.updateModal = this._modalService
            .create({
                nzTitle: 'Update Permission Groups',
                nzContent: UpdatePermissionGroupsComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'update-permissions-group-modal',
                nzComponentParams: {
                    updates: this.updates
                },
                nzFooter: [
                    {
                        label: 'UPDATE',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.permissionForm.valid),
                        onClick: componentInstance => componentInstance!.update().then(() => this.updateModal.destroy())
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.updateModal.destroy()
                    }
                ]
            });
    }

    /**
     * resolve errors
     *
     * @param {MouseEvent} e
     */
    resolveConflicts(e: MouseEvent): void
    {
        e.preventDefault();

        if (!this.listViewComponent && (this.listViewComponent.tableLoading || this.buttonLoader) && this.hasErrors())
        {
            return;    
        }

        const selectedList: Permission[] = [].concat
            .apply([], this.listViewComponent.permissionTableData.map((i: { list: any; }) => i.list))
            .filter((i: { isNew: boolean; }) => i.isNew)
            .map((p: Permission) => 
            {
                return {
                    name: p.group,
                    file: p.file
                }
            })

        if (_.isEmpty(selectedList))
        {
            return;
        }

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.UPDATE.TITLE,
                    nzContent: AppConst.dialogContent.UPDATE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () =>
                    {
                        this._logger.debug('[resolve permission conflicts]', selectedList);
                
                        this.buttonLoader = true;
                
                        this._permsService
                            .resolveConflicts({ list: selectedList })
                            .pipe(
                                takeUntil(this._unsubscribeAll),
                                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
                            )
                            .subscribe(
                                message =>
                                {
                                    this._permsService.onUpdateSuccess.next(true);
                                    
                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                                },
                                error => 
                                {
                                    throw error;
                                }
                            );
                    }
                }
            );
    }

    /**
     * Edit subscriber (site-manager) permissions
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    manageSubscriberPermissions(e: MouseEvent, type: string): void
    {
        e.preventDefault();

        if (!this.listViewComponent && (this.listViewComponent.tableLoading || this.buttonLoader))
        {
            return;    
        }

        this.buttonLoader = true;

        forkJoin([
            this._permsService.getDependency(type === '0' ? AppConst.roleLevel.OWNER : AppConst.roleLevel.PARENT),
            this._permsService.getTypePermissions(type === '0' ? AppConst.roleLevel.OWNER : AppConst.roleLevel.PARENT)
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                ([resource, permissions]) =>
                {
                    if (_.isEmpty(resource) || _.isEmpty(permissions)) 
                    { 
                        return; 
                    }

                    this.dialogRef = this._matDialog
                        .open(UpdateOrganizationPermissionsComponent,
                            {
                                panelClass: 'update-organization-permissions-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    type: type === '0' ? AppConst.roleLevel.OWNER : AppConst.roleLevel.PARENT,
                                    resource: resource,
                                    selected: permissions
                                }
                            });

                    this.dialogRef
                        .afterClosed()
                        .subscribe(
                            message => 
                            {
                                if (!message) 
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
}

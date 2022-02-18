import { Component, OnInit, ViewEncapsulation, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject, forkJoin } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';

import { NzModalService, NzModalRef } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { NotificationService } from 'app/shared/service/notification.service';
import { RoleService } from './services/role.service';
import { AuthService } from 'app/shared/service/auth.service';

import { RoleAddOrEditDialogComponent } from './dialogs/new-or-edit/new-or-edit.component';

import { AppConst } from 'app/shared/AppConst';
import { Role } from './role.model';


@Component({
    selector: 'app-role',
    templateUrl: './role.component.html',
    styleUrls: ['./role.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class RoleComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    roleList: Role[];
    buttonLoader: boolean;
    hasActionButton: boolean;

    dialogRef: any;
    confirmModal: NzModalRef;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {RoleService} _roleService
     * @param {MatDialog} _matDialog
     * @param {NzModalService} _modalService
     * @param {AuthService} _authService
     */
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _roleService: RoleService,
        private _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _authService: AuthService
    ) {
        // Set defaults
        this.buttonLoader = false;
        this.hasActionButton = this._authService.canAccess(['AC2', 'AC3'], 'N05');

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('role !!!');

        // Subscribe to role changes
        this._roleService
            .onRoleChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((roles: any) => {
                this._logger.debug('[roles]', roles);
                this.roleList = roles;
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Close all dialogs
        this._matDialog.closeAll();

        if (this.confirmModal) {
            this.confirmModal.close();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Add new role item
     */
    addDialog(e: MouseEvent): void {
        e.preventDefault();

        this.buttonLoader = true;

        this._roleService
            .getDependency()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response => {
                    if (_.isEmpty(response)) { return; }

                    this.dialogRef = this._matDialog
                        .open(RoleAddOrEditDialogComponent,
                            {
                                panelClass: 'role-new-or-edit-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.NEW,
                                    response: {
                                        depends: response
                                    }
                                }
                            });

                    this.dialogRef
                        .afterClosed()
                        .subscribe(message => {
                            if (!message) {
                                return;
                            }

                            this._notification.clearSnackBar();

                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                },
                error => {
                    throw error;
                }
            );
    }

    /**
     * Edit role item
     *
     * @param {Role} item
     * @param {MouseEvent} e
     */
    editDialog(item: Role, e: MouseEvent): void {
        e.preventDefault();

        item.isLoading = true;

        forkJoin([
            this._roleService.getDependency(),
            this._roleService.getRole(item.id)
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => item.isLoading = false, 200))
            )
            .subscribe(
                ([response, role]) => {
                    this.dialogRef = this._matDialog
                        .open(RoleAddOrEditDialogComponent,
                            {
                                panelClass: 'role-new-or-edit-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.EDIT,
                                    response: {
                                        depends: response,
                                        role: role
                                    }
                                }
                            });

                    this.dialogRef
                        .afterClosed()
                        .subscribe(message => {
                            if (!message) {
                                return;
                            }

                            this._notification.clearSnackBar();

                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                },
                error => {
                    throw error;
                }
            );
    }

    /**
     * Delete role item
     *
     * @param {Role} item
     * @param {MouseEvent} e
     */
    delete(item: Role, e: MouseEvent): void {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {
                            this._roleService
                                .deleteRole(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

}

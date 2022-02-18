import { Component, OnInit, ViewEncapsulation, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildrenService } from '../../services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Child } from '../../child.model';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { User } from 'app/main/modules/user/user.model';

import { ChildSetUserComponent } from '../../modals/set-user/set-user.component';


@Component({
    selector: 'child-details-users-view',
    templateUrl: './users-view.component.html',
    styleUrls: ['./users-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildDetailsUsersViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    buttonLoader: boolean;
    setUserModal: NzModalRef;
    confirmModal: NzModalRef;

    @Input() selected: Child;

    @Output()
    updateScroll: EventEmitter<any>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildrenService} _childrenService
     * @param {NotificationService} _notification
     * @param {NzModalService} _modalService
     */
    constructor(
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
    )
    {
        // set default values
        this.buttonLoader = false;
        this.updateScroll = new EventEmitter();

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
        this._logger.debug('child details - user view !!!');

        // Initial reference
        this.child = this.selected;

        // Subscribe to update current child on changes
        this._childrenService
            .onCurrentChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentChild => this.child = !currentChild ? null : currentChild);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.updateScroll.unsubscribe();

        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }

        if (this.setUserModal)
        {
            this.setUserModal.close();    
        }
        
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Add user to child
     *
     * @param {MouseEvent} e
     */
    addUser(e: MouseEvent): void
    {
        e.preventDefault();

        this.buttonLoader = true;

        this.child.parents.map(i => i.isLoading = true);

        this._childrenService
            .getUsers(this.child.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                {
                    this.child.parents.map(i => i.isLoading = false);

                    setTimeout(() => this.buttonLoader = false, 100);
                })
            )
            .subscribe(response =>
            {
                this._logger.debug('[get parent type users]', response);

                this.setUserModal = this._modalService
                    .create({
                        nzTitle: 'Select Parent',
                        nzContent: ChildSetUserComponent,
                        nzMaskClosable: false,
                        nzComponentParams: {
                            users: response
                        },
                        nzWrapClassName: 'custom-search-list',
                        nzFooter: [
                            {
                                label: 'SAVE',
                                type: 'primary',
                                disabled: componentInstance => !(componentInstance!.ChildSetUserForm.valid),
                                onClick: componentInstance =>
                                {
                                    const selectedUser = componentInstance.getSelectedUser();

                                    if (!_.isNull(selectedUser))
                                    {

                                        if (this.child.parents.filter(val => val.isPrimaryPayer === true).length === 0) 
                                        {

                                            this.confirmModal = this._modalService
                                                .confirm(
                                                    {
                                                        nzTitle: 'Primary Payer',
                                                        nzContent: `Would you like to assign this user as primary payer?`,
                                                        nzWrapClassName: 'vertical-center-modal',
                                                        nzOkText: 'Yes',
                                                        nzOkType: 'primary',
                                                        nzCancelText: 'No',
                                                        nzOnOk: () => {
                                                            this.confirmAddUser(selectedUser, true);
                                                        },
                                                        nzOnCancel: () => {
                                                            this.confirmAddUser(selectedUser, false);
                                                        }
                                                    }
                                                );

                                        } 
                                        else 
                                        {
                                            this.confirmAddUser(selectedUser, false);
                                        }
                                        
                                    } 

                                    this.setUserModal.destroy();
                                }
                            },
                            {
                                label: 'CLOSE',
                                type: 'danger',
                                onClick: () => this.setUserModal.destroy()
                            }
                        ]
                    });

                this.setUserModal
                    .afterOpen
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(() => setTimeout(() => this.setUserModal.getContentComponent().updateListScroll(), 250));
            });
    }

    /**
     * Confirm add user
     * @param {any} selectedUser 
     * @param {boolean} primaryPayer
     * @returns {Promise} 
     */
    confirmAddUser(selectedUser: any, primaryPayer: boolean): Promise<any> 
    {

        return new Promise((resolve, reject) =>
        {

            this.child.parents.map(i => i.isLoading = true);

            this.buttonLoader = true;

            this._childrenService
                .updateUser({
                    child: this.child.id,
                    user: selectedUser.id,
                    type: AppConst.modalActionTypes.NEW,
                    primary_payer: primaryPayer
                })
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        setTimeout(() => this.child.parents.map(i => i.isLoading = false), 50);
                        this.buttonLoader = false;
                        resolve(null);
                    })
                )
                .subscribe(
                    message =>
                    {
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        this.updateScroll.next();
                    },
                    error =>
                    {
                        reject(error);
                    }
                );
            
        });

    }

    /**
     * Delete user item
     *
     * @param {User} item
     * @param {MouseEvent} e
     */
    removeUser(item: User, e: MouseEvent): void
    {
        e.preventDefault();

        const content = (item.isPrimaryPayer) 
            ? AppConst.dialogContent.DELETE.BODY + ` You are removing a primary payer, please make sure to assign another parent as primary payer.` 
            : AppConst.dialogContent.DELETE.BODY;

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: content,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) =>
                        {
                            item.isLoading = true;

                            this.buttonLoader = true;

                            this._childrenService
                                .updateUser({
                                    child: this.child.id,
                                    user: item.id,
                                    type: AppConst.modalActionTypes.DELETE
                                })
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() =>
                                    {
                                        this.buttonLoader = false;
                                        
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message =>
                                    {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        this.updateScroll.next();
                                    },
                                    error =>
                                    {
                                        item.isLoading = false;

                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    /**
     * Set primary payer
     * @param {User} item
     * @param {MouseEvent} e
     */
    setPrimaryPayer(item: User, e: MouseEvent): void
    {
        e.preventDefault();

        if (this.child.parents.filter((user) => user.isPrimaryPayer).length > 0) {
            // Confirm dialog
            
            this.confirmModal = this._modalService
            .confirm({
                nzTitle: 'Warning',
                nzContent: 'If any other parent is set as primary paying parent, please make sure to adjust the account balance to include the previous payment from the other parents account',
                nzWrapClassName: 'vertical-center-modal',
                nzOkText: 'Continue',
                nzOkType: 'primary',
                nzOnOk: this.processPrimaryPayer.bind(this, item)
            });

        } else {
            this.processPrimaryPayer(item);
        }

    }

    /**
     * Process Primary Payer
     * @param {User} item
     * @returns {Promise}
     */
    processPrimaryPayer(item: User): Promise<any> 
    {
        return new Promise((resolve, reject) =>
        {

            item.isLoading = true;

            this.buttonLoader = true;

            this._childrenService
                .setPrimaryPayer({
                    child: this.child.id,
                    user: item.id
                })
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        this.buttonLoader = false;
                        
                        resolve(null);
                    })
                )
                .subscribe(
                    (data: {message: string, item: Child}) =>
                    {
                        setTimeout(() => this._notification.displaySnackBar(data.message, NotifyType.SUCCESS), 200);

                        this.updateScroll.next();
                    },
                    error =>
                    {
                        item.isLoading = false;

                        throw error;
                    }
                );
        });
    }
}

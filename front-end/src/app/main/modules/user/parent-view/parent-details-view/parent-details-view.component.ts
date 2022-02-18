import { Component, OnInit, ViewEncapsulation, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Child } from 'app/main/modules/child/child.model';
import { Subject } from 'rxjs';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { NGXLogger } from 'ngx-logger';
import { ChildrenService } from 'app/main/modules/child/services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { CommonService } from 'app/shared/service/common.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { User } from '../../user.model';
import { AuthService } from 'app/shared/service/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { UsersService } from '../../services/users.service';
import { MediaObserver } from '@angular/flex-layout';
import { Router } from '@angular/router';
import { UserResetPasswordComponent } from '../../modals/reset-password/reset-password.component';

@Component({
    selector: 'user-base-parent-details-view',
    templateUrl: './parent-details-view.component.html',
    styleUrls: ['./parent-details-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentDetailsViewComponent implements OnInit, AfterViewInit, OnDestroy {
    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    user: User;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];

    hasUsers: boolean;
    confirmModal: NzModalRef;

    passwordResetModal: NzModalRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {NzModalService} _modalService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {CommonService} _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _usersService: UsersService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _router: Router,
        private _commonService: CommonService,
        private _authService: AuthService
    ) {
        // Set default values
        this.hasUsers = this._usersService.hasUsers();

        this.pageSize = this._usersService.defaultPageSize;
        this.pageIndex = this._usersService.defaultPageIndex;
        this.pageSizeOptions = this._usersService.defaultPageSizeOptions;

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
        this._logger.debug('parent details view !!!');

        // Subscribe to update current user on changes
        this._usersService.onCurrentUserChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentUser => {
                this._logger.debug(
                    '[user detail - current user]',
                    currentUser
                );

                // set current child
                this.user = !currentUser ? null : currentUser;
            });

        // Subscribe to list view changes
        this._usersService.onListViewItemChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                // reset scroll position
                this._commonService.updateScrollBar(
                    this.directiveScroll,
                    updateScrollPosition.TOP,
                    100
                );
            });
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void {}

    /**
     * On destroy
     */
    ngOnDestroy(): void 
    {
        if (this.confirmModal) 
        {
            this.confirmModal.close();
        }

        if (this.passwordResetModal) 
        {
            this.passwordResetModal.close();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number {
        return index;
    }

    /**
     * deselect current child
     *
     * @param {MouseEvent} [e=null]
     */
    deselectCurrentUser(e: MouseEvent = null): void {
        if (e) {
            e.preventDefault();
        }

        this._usersService.onCurrentUserChanged.next(null);
    }

    onPaginationChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._usersService.defaultPageIndex;
        }

        this._usersService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * toggle sidebar
     *
     * @param {MouseEvent} e
     */
    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * update view scroll
     */
    updateScroll(): void {
        if (this.directiveScroll) {
            setTimeout(() => this.directiveScroll.update(true), 250);
        }
    }

    /**
     * Delete child item
     *
     * @param {MouseEvent} e
     */
    delete(item: User, e: MouseEvent): void 
    {
        e.preventDefault();

        this.confirmModal = this._modalService.confirm({
            nzTitle: AppConst.dialogContent.DELETE.TITLE,
            nzContent: AppConst.dialogContent.DELETE.BODY,
            nzWrapClassName: 'vertical-center-modal',
            nzOkText: 'Yes',
            nzOkType: 'danger',
            nzOnOk: () => {
                return new Promise((resolve, reject) => {
                    this._usersService
                        .deleteUser(item.id)
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            finalize(() => resolve())
                        )
                        .subscribe(
                            message => {
                                setTimeout(
                                    () =>
                                        this._notification.displaySnackBar(
                                            message,
                                            NotifyType.SUCCESS
                                        ),
                                    200
                                );

                                this.onPaginationChange(true);
                            },
                            error => {
                                throw error;
                            }
                        );
                });
            }
        });
    }

    goToInvitation(e: MouseEvent): void 
    {
        e.preventDefault();

        this._router.navigate(['/manage-invitations']);
    }

    edit(item: User, e: MouseEvent): void 
    {
        e.preventDefault();

        this._router.navigate([this._router.url + '/user/' + item.id]);
    }

    getChildProfileImage(item: any) : string
    {
        return item.child_profile_image 
            ? this._commonService.getS3FullLinkforProfileImage(item.child_profile_image)
            : `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }

    /**
     * reset user password
     *
     * @param {MouseEvent} e
     * @param {User} user
     */
    resetPassword(e: MouseEvent, user: User): void
    {
        e.preventDefault();

        this.passwordResetModal = this._modalService
            .create({
                nzTitle: 'Reset Password',
                nzContent: UserResetPasswordComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'user-reset-password-modal',
                nzFooter: [
                    {
                        label: 'RESET',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.resetPasswordForm.valid),
                        onClick: componentInstance =>
                        {
                            return new Promise((resolve, reject) => 
                            {
                                this._authService
                                    .resetPassword({
                                        user: user.id,
                                        password: componentInstance!.getValue().password,
                                        password_confirmation: componentInstance!.getValue().confirm,
                                        verify_email: true
                                    })
                                    .pipe(takeUntil(this._unsubscribeAll))
                                    .subscribe(
                                        message => 
                                        {
                                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                            this.passwordResetModal.destroy();
                                        },
                                        error => 
                                        {
                                            throw error;
                                        }
                                    );
                            });
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.passwordResetModal.destroy()
                    }
                ]
            });
    }
}

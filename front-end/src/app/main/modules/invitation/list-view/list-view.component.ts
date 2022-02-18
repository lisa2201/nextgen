import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy, Input } from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { MatDialog } from '@angular/material/dialog';

import { MediaObserver, MediaChange } from '@angular/flex-layout';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import { AuthService } from 'app/shared/service/auth.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { InvitationService } from '../services/invitation.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Invitation } from '../invitation.model';

import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Branch } from '../../branch/branch.model';

import { InvitationAddOrEditDialogComponent } from '../dialogs/new-or-edit/new-or-edit.component';
import { InvitationSingleNewOrEditComponent } from '../dialogs/single-new-or-edit/single-new-or-edit.component';
import { ShowInvitationRolesComponent } from '../modals/show-invitation-roles/show-invitation-roles.component';

@Component({
    selector: 'invitation-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InvitationListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    invitationList: Invitation[];
    branches: Branch[];
    
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;

    mapOfSort: { [key: string]: any } = {
        email: null,
        branch: null,
        expires: null
    };

    filterValue: any = null;

    searchInput: FormControl;

    dialogRef: any;
    confirmModal: NzModalRef;
    showRolesModal: NzModalRef;

    @Input() isCreateButtonLoading: boolean;

    @Output()
    updateTableScroll: EventEmitter<any>;

    /**
     * Constructor
     *
     * @param {AuthService} _authService
     * @param {NGXLogger} _logger
     * @param {MatDialog} _matDialog
     * @param {InvitationService} _invitationService
     * @param {NotificationService} _notification
     * @param {NzModalService} _modalService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {MediaObserver} _mediaObserver
     */
    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _invitationService: InvitationService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    )
    {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._invitationService.defaultPageSize;
        this.pageIndex = this._invitationService.defaultPageIndex;
        this.pageSizeOptions = this._invitationService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();

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
        this._logger.debug('invitation list view!!!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to invitation list changes
        this._invitationService
            .onInvitationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[invitations]', response);

                this.invitationList = response.items;
                this.total = response.totalDisplay;

                this.searchInput[(response.total < 1 || (response.filtered && response.totalDisplay < 1)) ? 'disable' : 'enable']({ emitEvent: false });

                // reset search
                if (response.total < 1 || (response.filtered && response.totalDisplay < 1)) { this.resetSearch(); }

                this.updateTableScroll.next();
            });

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
                    this._invitationService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._invitationService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._invitationService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) =>
            {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._invitationService.defaultPageIndex;
            });

        // Subscribe to branch list changes
        this._invitationService
            .onFilterBranchesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => this.branches = response);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.showRolesModal)
        {
            this.showRolesModal.close();    
        }

        this.updateTableScroll.unsubscribe();
        
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
     * sort column
     *
     * @param {string} sortName
     * @param {string} sortValue
     */
    sortColumns(sortName: string, sortValue: string): void
    {
        if (this.total < 1)
        {
            setTimeout(() => this.resetSort(), 0);

            return;
        }

        for (const key in this.mapOfSort)
        {
            this.mapOfSort[key] = (key === sortName) ? sortValue : null;
        }

        this._invitationService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    /**
     * reset sort
     *
     */
    resetSort(): void
    {
        for (const key in this.mapOfSort) { this.mapOfSort[key] = null; }
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
        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: false });

        if (updateView)
        {
            this._invitationService.onSearchTextChanged.next(this.searchInput.value);
        }
    }

    /**
     * get items for table
     *
     * @param {boolean} [reset=false]
     */
    onTableChange(reset: boolean = false): void
    {
        if (reset)
        {
            this.pageIndex = this._invitationService.defaultPageIndex;
        }

        this._invitationService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * Toggle sidebar
     *
     * @param name
     */
    toggleSidebar(name: string): void
    {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * Edit invitation item
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    editDialog(item: Invitation, e: MouseEvent): void
    {
        e.preventDefault();

        if (this.tableLoading || this.isCreateButtonLoading)
        {
            return;
        }

        this._invitationService.onTableLoaderChanged.next(true);

        combineLatest(
            this._invitationService.getDependency(),
            this._invitationService.getInvitation(item.id)
        )
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this._invitationService.onTableLoaderChanged.next(false), 200))
            )
            .subscribe(
                ([depends, invitation]) =>
                {
                    const _component: any = this._authService.isOwner() ? InvitationAddOrEditDialogComponent : InvitationSingleNewOrEditComponent;
                    const _componentClass: any = this._authService.isOwner() ? 'invitation-new-or-edit-dialog' : 'invitation-single-new-or-edit-dialog';

                    this.dialogRef = this._matDialog
                        .open(_component,
                        {
                            panelClass: _componentClass,
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.EDIT,
                                has_owner_access: invitation.isOwner,
                                response: {
                                    depends: depends,
                                    invitation: invitation
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
                        });
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * Delete invitation item
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    delete(item: Invitation, e: MouseEvent): void
    {
        e.preventDefault();

        if (this.tableLoading || this.isCreateButtonLoading)
        {
            return;
        }

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) =>
                        {
                            this._invitationService
                                .deleteInvitation(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message =>
                                    {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        this.onTableChange(true);
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

    /**
     * resend invitation email
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    reSend(item: Invitation, e: MouseEvent): void
    {
        e.preventDefault();

        this._invitationService
            .resendInvitation(item.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
            )
            .subscribe(
                message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                error => {
                    throw error;
                }
            );
    }

    /**
     * show role details
     *
     * @param {MouseEvent} e
     */
    showRoleDetails(e: MouseEvent, item: Invitation): void
    {
        e.preventDefault();

        if (this.tableLoading || this.isCreateButtonLoading)
        {
            return;
        }

        this._invitationService.onTableLoaderChanged.next(true);

        this._invitationService
            .getRoles(item.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this._invitationService.onTableLoaderChanged.next(false), 200))
            )
            .subscribe(
                response => 
                {
                    if(_.isEmpty(response))
                    {
                        return;
                    }

                    response.forEach((i: any) => 
                    {
                        i.branch = this.branches.filter(b => b.id === i.branch).length > 0 ? _.head(this.branches.filter(b => b.id === i.branch)).name : 'Not applicable';
                        return i;
                    });

                    this.showRolesModal = this._modalService
                        .create({
                            nzTitle: 'View Invitation Assign Roles',
                            nzContent: ShowInvitationRolesComponent,
                            nzMaskClosable: false,
                            nzComponentParams: {
                                list: response,
                                invitation: item
                            },
                            nzWrapClassName: 'show-invitation-roles-modal',
                            nzFooter: [
                                {
                                    label: 'CLOSE',
                                    type: 'default',
                                    onClick: () => this.showRolesModal.destroy()
                                }
                            ]
                        });
                    
                },
                error => 
                {
                    throw error;
                }
            );

    }

}

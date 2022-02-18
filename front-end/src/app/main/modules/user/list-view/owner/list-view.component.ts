import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { MediaObserver, MediaChange } from '@angular/flex-layout';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';
import { UsersService } from '../../services/users.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

import { User } from '../../user.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import {CommonService} from '../../../../../shared/service/common.service';

@Component({
    selector: 'users-owner-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ManageUsersOwnerListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    userList: User[];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total: number;
    tableLoading: boolean;
    mobilePagination: boolean;

    mapOfSort: { [key: string]: any } = {
        name: null,
        email: null,
        branch: null,
        status: null,
        level: null,
        login: null
    };

    filterValue: any = null;

    searchInput: FormControl;

    dialogRef: any;
    confirmModal: NzModalRef;

    @Output()
    updateTableScroll: EventEmitter<any>;

    /**
     * Constructor
     *
     * @param {AuthService} _authService
     * @param {NGXLogger} _logger
     * @param {MatDialog} _matDialog
     * @param {UsersService} _usersService
     * @param {NotificationService} _notification
     * @param {NzModalService} _modalService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {MediaObserver} _mediaObserver
     * @param _commonService
     */
    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _usersService: UsersService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _commonService: CommonService
    )
    {
        // set default values
        this.total = 0;
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._usersService.defaultPageSize;
        this.pageIndex = this._usersService.defaultPageIndex;
        this.pageSizeOptions = this._usersService.defaultPageSizeOptions;

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
        this._logger.debug('users list view!!!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to user list changes
        this._usersService
            .onUsersChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[users]', response);

                this.userList = response.items;
                this.total = response.totalDisplay;

                this.searchInput[(response.total < 1 || (response.filtered && response.totalDisplay < 1)) ? 'disable' : 'enable']({ emitEvent: false });

                // reset search
                if (response.total < 1 || (response.filtered && response.totalDisplay < 1)) { this.clearSearch(null, false); }

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
                    this._usersService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._usersService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._usersService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) =>
            {
                this._logger.debug('[filter changes]', filter);

                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._usersService.defaultPageIndex;

                // reset table sort
                this.resetSort();
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.updateTableScroll.unsubscribe();

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

        this._usersService.onSortChanged.next({
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
    clearSearch(e: MouseEvent, _emit: boolean = true): void
    {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: _emit });
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
            this.pageIndex = this._usersService.defaultPageIndex;
        }

        this._usersService.onPaginationChanged.next({
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
     * Delete user item
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    delete(item: User, e: MouseEvent): void
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
                    nzOnOk: () => {
                        return new Promise((resolve, reject) =>
                        {
                            this._usersService
                                .deleteUser(item.id)
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

    getStaffProfileImage(item) : string{
        try
        {
            return item.image !== '' ? this._commonService.getS3FullLinkforProfileImage(item.image) : item.roleLevel === AppConst.roleLevel.PARENT ? AppConst.image.PROFILE_PP_CALLBACK : AppConst.image.PROFILE_AP_CALLBACK;
        }
        catch (err)
        {
            return AppConst.image.PROFILE_CALLBACK;
        }
    }

}

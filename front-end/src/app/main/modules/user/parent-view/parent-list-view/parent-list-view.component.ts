import {
    Component,
    OnInit,
    ViewEncapsulation,
    OnDestroy,
    ViewChild
} from '@angular/core';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import {
    fadeInOnEnterAnimation,
    fadeOutOnLeaveAnimation
} from 'angular-animations';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { Child } from 'app/main/modules/child/child.model';
import { ChildrenService } from 'app/main/modules/child/services/children.service';
import { FormControl } from '@angular/forms';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { User } from '../../user.model';
import { AuthService } from 'app/shared/service/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { UsersService } from '../../services/users.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { Router } from '@angular/router';
import { EventEmitter } from 'events';
import {CommonService} from '../../../../../shared/service/common.service';
import {AppConst} from '../../../../../shared/AppConst';

@Component({
    selector: 'user-base-parent-list-view',
    templateUrl: './parent-list-view.component.html',
    styleUrls: ['./parent-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentListViewComponent implements OnInit, OnDestroy {
    // Private
    private _unsubscribeAll: Subject<any>;

    childrenList: Child[];
    currentUser: User;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total: number;
    listViewLoading: boolean;
    disableScroll: boolean;

    userList: User[];

    hasActionButton: boolean;
    updateButtonsTriggered: boolean;

    mobilePagination: boolean;
    filterActive: boolean;

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

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;
    updateTableScroll: any;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param _authService
     * @param _usersService
     * @param _fuseSidebarService
     * @param _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _usersService: UsersService,
        private _fuseSidebarService: FuseSidebarService,
        private _commonService: CommonService
        // private _childrenService: ChildrenService,
    ) {
        // Set default values
        this.total = 0;
        this.pageSizeChanger = true;
        this.listViewLoading = false;
        this.disableScroll = false;

        this.pageSize = this._usersService.defaultPageSize;
        this.pageIndex = this._usersService.currentPageIndex;
        this.pageSizeOptions = this._usersService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // this.pageSize = this._usersService.defaultPageSize;
        // this.pageIndex = this._usersService.defaultPageIndex;
        // this.pageSizeOptions = this._usersService.defaultPageSizeOptions;

        this.hasActionButton = this._authService.canAccess(
            ['AC2', 'AC3'],
            'N04'
        );

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();

        this.filterActive = !_.isNull(this._usersService.filterBy);
    }

    /**
     * On init
     */
    ngOnInit(): void {
        // Subscribe to user list changes
        this._usersService.onUsersChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[users]', response);

                this.userList = response.items;
                this.total = response.totalDisplay;
                this.searchInput[
                    response.total < 1 ||
                    (response.filtered && response.totalDisplay < 1)
                        ? 'disable'
                        : 'enable'
                ]({ emitEvent: false });
                this.setRememberedUser();

                this.updateListScroll();
            });

        this._usersService.onCurrentUserChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentUser => {
                this._logger.debug('[current child]', currentUser);

                this.currentUser = !currentUser ? null : currentUser;
            });

        this.searchInput.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(searchText => {
                this._logger.debug('[search change]', searchText);

                if (!_.isNull(searchText)) {
                    this._usersService.onSearchTextChanged.next(searchText);
                }
            });

        this._usersService.onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[list view loader]', value);

                this.listViewLoading = value;
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    getUser(e: MouseEvent, id: string): void {
   
        e.preventDefault();
        
        if (!this.currentUser || this.currentUser.id !== id) {
            this._usersService.setCurrentUser(id);            
            this._usersService.onListViewItemChanged.next();
        }
    }

    /**
     * set previously selected child
     *
     * @memberof ChildListComponent
     */
    setRememberedUser(): void {
  
        if (this._usersService.currentUser) {
            setTimeout(() =>
                this._usersService.setCurrentUser(
                    this._usersService.currentUser.id
                )
            );
        }
    }

    onScroll(): void {

        // add one
        this.pageIndex += 1;

        this._usersService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });

        this._usersService.setCurrentPageIndex(this.pageIndex);
    }

    updateListScroll(): void {
        if (this.directiveScroll) {
            this.directiveScroll.update(true);
        }
    }
    resetSort(): void {
        for (const key in this.mapOfSort) {
            this.mapOfSort[key] = null;
        }
    }

    clearSearch(e: MouseEvent, _emit: boolean = true): void {
        if (!_.isNull(e)) {
            e.preventDefault();
        }

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: _emit });
    }

    onPaginationChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._usersService.defaultPageIndex;
        }

        this._usersService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });

        this._usersService.setCurrentPageIndex(this.pageIndex);
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
     * update filter straus
     *
     * @param {boolean} event
     */
    updateFilterActiveStatus(event: boolean): void
    {
        this.filterActive = event;
    }

    /**
     * refresh children list
     *
     * @param {MouseEvent} e
     */
    refreshList(e: MouseEvent): void
    {
        e.preventDefault();
        setTimeout(() => this._usersService.onFilterChanged.next(null));

        // if (this.directiveScroll.listViewLoading)
        // {
        //     return;    
        // }
        this.pageIndex = this._usersService.defaultPageIndex;
        this._usersService.onPaginationChanged.next({
            page: this._usersService.defaultPageIndex,
            size: this._usersService.defaultPageSize
        });
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

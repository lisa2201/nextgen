import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { NzModalRef } from 'ng-zorro-antd';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { ChildrenService } from './services/children.service';

import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';

import { Child } from './child.model';

import { ChildAddDialogComponent } from './dialogs/new/new.component';
import { ChildListComponent } from './child-list/child-list.component';

@Component({
    selector: 'app-child',
    templateUrl: './child.component.html',
    styleUrls: ['./child.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildComponent implements OnInit, OnDestroy {
    
    // Private
    private _unsubscribeAll: Subject<any>;

    currentChild: Child;
    buttonLoader: boolean;

    searchInput: FormControl;
    disableFilterButton: boolean;
    filterActive: boolean;
    dialogRef: any;
    confirmModal: NzModalRef;

    @ViewChild(ChildListComponent)
    listComponent: ChildListComponent;

    /**
     * Constructor
     * 
     * @param {AuthService} _authService
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {MatDialog} _matDialog
     * @param {ChildrenService} _childrenService
     * @param {Router} _router
     */
    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _childrenService: ChildrenService,
        private _fuseSidebarService: FuseSidebarService,
        private _router: Router
    )
    {
        // Set default values
        this.buttonLoader = false;
        this.searchInput = new FormControl({ value: this._childrenService.searchText ? this._childrenService.searchText : null, disabled: false });
        this.disableFilterButton = false;
        this.filterActive = !_.isNull(this._childrenService.filterBy);

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
        this._logger.debug('child !!!');

        // Subscribe to children list changes
        this._childrenService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[children]', response);

                this.searchInput[(response.total < 1 || (response.filtered && response.totalDisplay < 1)) ? 'disable' : 'enable']({ emitEvent: false });

                // reset search
                if (response.total < 1 || (response.filtered && response.totalDisplay < 1)) { this.resetSearch(); }

                // disable filter button access
                this.disableFilterButton = response.total < 1;
            });

        // Subscribe to update current child on changes
        this._childrenService
            .onCurrentChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentChild =>
            {
                this._logger.debug('[child view - current child]', currentChild);

                this.currentChild = (!currentChild) ? null : currentChild;
            });

        // Subscribe to search input changes
        this.searchInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800)
            )
            .subscribe(searchText =>
            {
                this._logger.debug('[search change]', searchText);

                if (!_.isNull(searchText) && !this.listComponent.listViewLoading  && !this.listComponent.detailContentLoading)
                {
                    this._childrenService.onSearchTextChanged.next(searchText);
                }
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        // reset service
        this._childrenService.unsubscribeOptions(this._router.routerState.snapshot.url.indexOf('/child') > -1);

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

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
        // this.resetSort();

        this.searchInput.patchValue('', { emitEvent: false });

        if (updateView)
        {
            this._childrenService.resetCurrentChild();
            
            this._childrenService.onSearchTextChanged.next(this.searchInput.value);
        }
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
     * Toggle sidebar
     *
     * @param name
     */
    toggleSidebar(name: string): void
    {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * refresh children list
     *
     * @param {MouseEvent} e
     */
    refreshList(e: MouseEvent): void
    {
        e.preventDefault();
       
        if (this.listComponent.listViewLoading || this.listComponent.detailContentLoading)
        {
            return;    
        }

        this._childrenService.clearLastRememberOptions();

        this._childrenService.resetCurrentChild();

        this._childrenService.onPaginationChanged.next({
            page: this._childrenService.defaultPageIndex,
            size: this._childrenService.defaultPageSize
        });
    }

    /**
     * Add new child item
     */
    addDialog(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.listComponent.listViewLoading || this.listComponent.detailContentLoading)
        {
            return;    
        }

        setTimeout(() => 
        {
            if (this._fuseSidebarService.getSidebar('children-list-filter-sidebar').opened) this._fuseSidebarService.getSidebar('children-list-filter-sidebar').close();
            
            if (this._fuseSidebarService.getSidebar('child-detail-navigation-sidebar').opened) this._fuseSidebarService.getSidebar('child-detail-navigation-sidebar').close();
        }, 250);
        
        this.dialogRef = this._matDialog
            .open(ChildAddDialogComponent,
            {
                panelClass: 'child-new-dialog',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    action: AppConst.modalActionTypes.NEW,
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
    }

}

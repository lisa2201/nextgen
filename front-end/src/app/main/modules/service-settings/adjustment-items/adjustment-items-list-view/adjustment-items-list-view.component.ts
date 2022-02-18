import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { AdjustmentItem } from '../adjustment-item.model';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { AdjustmentItemsService } from '../services/adjustment-items.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { AddAdjustmentItemsDialogComponent } from '../dialogs/add-adjustment-items-dialog/add-adjustment-items-dialog.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NzModalService, NzModalRef, isTemplateRef } from 'ng-zorro-antd';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'app-adjustment-items-list-view',
    templateUrl: './adjustment-items-list-view.component.html',
    styleUrls: ['./adjustment-items-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AdjustmentItemsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    adjustmentItemList: AdjustmentItem[] = [];

    dialogRef: any;
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    confirmModal: NzModalRef;

    mapOfSort: { [key: string]: any } = {
        name: null,
        description: null
    };

    filterValue: any = null;
    searchInput: FormControl;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _adjustmentItemsService: AdjustmentItemsService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _modalService: NzModalService
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._adjustmentItemsService.defaultPageSize;
        this.pageIndex = this._adjustmentItemsService.defaultPageIndex;
        this.pageSizeOptions = this._adjustmentItemsService.defaultPageSizeOptions;

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
    ngOnInit(): void {

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._adjustmentItemsService
            .onAdjustmentItemChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[adjustmentItems]', response);

                this.adjustmentItemList = response.items;
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
            .subscribe(searchText => {
                this._logger.debug('[search change]', searchText);

                if (!_.isNull(searchText)) {
                    this._adjustmentItemsService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._adjustmentItemsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._adjustmentItemsService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._adjustmentItemsService.defaultPageIndex;
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
    // Methods
    // -----------------------------------------------------------------------------------------------------


    /**
     * Track By Function
     * @param {number} index 
     * @param {any} item 
     * @returns {number}
     */
    trackByFn(index: number, item: any): number {
        return index;
    }

    /**
     * Toggle sidebar
     * @param {string} name 
     */
    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * Reset Sort
     */
    resetSort(): void {
        for (const key in this.mapOfSort) { this.mapOfSort[key] = null; }
    }

    /**
     * Clear search
     * @param {MouseEvent} e 
     * @param {boolean} _emit 
     */
    clearSearch(e: MouseEvent, _emit: boolean = true): void {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: _emit });
    }

    /**
     * Table change handler
     * @param {boolean} reset 
     */
    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._adjustmentItemsService.defaultPageIndex;
        }

        this._adjustmentItemsService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * sort column
     *
     * @param {string} sortName
     * @param {string} sortValue
     */
    sortColumns(sortName: string, sortValue: string): void {
        if (this.total < 1) {
            setTimeout(() => this.resetSort(), 0);

            return;
        }

        for (const key in this.mapOfSort) {
            this.mapOfSort[key] = (key === sortName) ? sortValue : null;
        }

        this._adjustmentItemsService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    editItem(event: MouseEvent, data: AdjustmentItem): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(AddAdjustmentItemsDialogComponent,
                {
                    panelClass: 'add-adjustment-item-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        item: data,
                        response: {}
                    }
                });

        this.dialogRef
            .afterClosed()
            .subscribe((message: string) => {

                if (!message) {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => {
                    this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                    // this._adjustmentItemsService.listAdjustmentItems();
                    this.onTableChange(true);
                }, 200);

            });

    }

    deleteItem(event: MouseEvent, data: AdjustmentItem): void {

        event.preventDefault();

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
                            this._adjustmentItemsService
                                .deleteItem({id: data.id})
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

}

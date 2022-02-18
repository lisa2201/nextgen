import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import { ParentPaymentProvider } from '../parent-payment-provider.model';
import { ParentPaymentProvidersService } from '../services/parent-payment-providers.service';

import * as _ from 'lodash';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { AddParentPaymentProvidersDialogComponent } from '../dialogs/add-parent-payment-providers-dialog/add-parent-payment-providers-dialog.component';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'app-parent-payment-providers-list-view',
    templateUrl: './parent-payment-providers-list-view.component.html',
    styleUrls: ['./parent-payment-providers-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentPaymentProvidersListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    paymentProviders: ParentPaymentProvider[];
    branchCount: number;
    buttonLoader: boolean;

    confirmModal: NzModalRef;
    dialogRef: any;
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;

    mapOfSort: { [key: string]: any } = {
        name: null
    };

    filterValue: any = null;
    searchInput: FormControl;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _parentPaymentProvidersService: ParentPaymentProvidersService,
        private _logger: NGXLogger,
        private _mediaObserver: MediaObserver,
        private _fuseSidebarService: FuseSidebarService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _modalService: NzModalService
    ) {

        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._parentPaymentProvidersService.defaultPageSize;
        this.pageIndex = this._parentPaymentProvidersService.defaultPageIndex;
        this.pageSizeOptions = this._parentPaymentProvidersService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();

        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('payment terms list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes => {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._parentPaymentProvidersService
            .onPaymentProvidersChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[payment_providers]', response);

                this.paymentProviders = response.items;
                this.total = response.totalDisplay;

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
                    this._parentPaymentProvidersService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._parentPaymentProvidersService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._parentPaymentProvidersService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._parentPaymentProvidersService.defaultPageIndex;
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
            this.pageIndex = this._parentPaymentProvidersService.defaultPageIndex;
        }

        this._parentPaymentProvidersService.onPaginationChanged.next({
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

        this._parentPaymentProvidersService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    /**
     * Reload table
     */
    reloadTable(): void {
        this.onTableChange(false);
    }

    editDialog(event: MouseEvent, item: ParentPaymentProvider): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
                .open(AddParentPaymentProvidersDialogComponent,
                    {
                        panelClass: 'parent-payent-provider-dialog',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.EDIT,
                            provider: item,
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
                    this._parentPaymentProvidersService.listParentPaymentAccounts();
                }, 200);

            });


    }

    deleteDialog(event: MouseEvent, item: ParentPaymentProvider, index: number): void {

        event.preventDefault();

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
                            this._parentPaymentProvidersService
                                .deleteProvider({provider_id: item.id}, index)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => {
                                        this._parentPaymentProvidersService.listParentPaymentAccounts();
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200)
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

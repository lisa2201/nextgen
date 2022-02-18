import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import { PaymentTerm } from '../payment-terms.model';
import { PaymentTermsService } from '../services/payment-terms.service';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AddEditPaymentTermsComponent } from '../dialogs/add-edit-payment-terms/add-edit-payment-terms.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-payment-terms-list-view',
    templateUrl: './payment-terms-list-view.component.html',
    styleUrls: ['./payment-terms-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PaymentTermsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    paymentTermsList: PaymentTerm[] = [];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    dialogRef: any;

    mapOfSort: { [key: string]: any } = {
        name: null
    };

    filterValue: any = null;
    searchInput: FormControl;
    confirmModal: NzModalRef;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _paymentTermsService: PaymentTermsService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _matDialog: MatDialog,
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._paymentTermsService.defaultPageSize;
        this.pageIndex = this._paymentTermsService.defaultPageIndex;
        this.pageSizeOptions = this._paymentTermsService.defaultPageSizeOptions;

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

        this._logger.debug('payment terms list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._paymentTermsService
            .onPaymentTermsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[payment_terms]', response);

                this.paymentTermsList = response.items;
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
                    this._paymentTermsService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._paymentTermsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._paymentTermsService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._paymentTermsService.defaultPageIndex;
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
            this.pageIndex = this._paymentTermsService.defaultPageIndex;
        }

        this._paymentTermsService.onPaginationChanged.next({
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

        this._paymentTermsService.onSortChanged.next({
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

    updateTerm(event: MouseEvent, data: PaymentTerm): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(AddEditPaymentTermsComponent,
                {
                    panelClass: 'add-edit-payment-terms-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        term: data,
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
                    this._paymentTermsService.listPaymentTerms();
                }, 200);

            });


    }

    updateTermStatus(event: MouseEvent, id: string, status: boolean): void {

        event.preventDefault();

        const sendObj = {
            id: id,
            status: status === true ? '0' : '1'
        };

        this._paymentTermsService
            .updateStatusTerm(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe(
                message => {
                    setTimeout(() => {
                        this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                        this._paymentTermsService.listPaymentTerms();
                    }, 200);
                },
                error => {
                    throw error;
                }
            );

    }

    deleteTerm(event: MouseEvent, id: string): void {

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
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                id: id
                            };

                            this.tableLoading = true;

                            this._paymentTermsService
                                .deleteTerm(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        this.tableLoading = false;
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => {
                                            this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                                            this._paymentTermsService.listPaymentTerms();
                                        }, 200);
                                    },
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );

    }

    showEdit(data: PaymentTerm): boolean {

        return DateTimeHelper.parseMoment(data.transactionGenerationDate).isAfter(DateTimeHelper.now());

    }

}

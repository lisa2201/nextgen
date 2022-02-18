import { Component, OnInit, ViewEncapsulation, EventEmitter, Output, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FinanceAccountTransaction } from '../finance-account-transaction.model';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { FinanceAccountTransactionService } from '../services/finance-account-transaction.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { NzModalService, NzModalRef } from 'ng-zorro-antd';
import { FinanceService } from '../../shared/services/finance.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';

@Component({
    selector: 'app-finance-account-transactions-list-view',
    templateUrl: './finance-account-transactions-list-view.component.html',
    styleUrls: ['./finance-account-transactions-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountTransactionsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    financeAccountTransactionList: FinanceAccountTransaction[] = [];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    confirmModal: NzModalRef;

    mapOfSort: { [key: string]: any } = {
        date: null,
        parent: null,
        child: null,
        category: null,
        amount: null,
        type: null,
        created: null
    };

    filterValue: any = null;
    searchInput: FormControl;
    filterByParent: boolean;
    showReversed: boolean;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _financeAccountTransactionService: FinanceAccountTransactionService,
        private _fuseSidebarService: FuseSidebarService,
        private _modalService: NzModalService,
        private _financeService: FinanceService,
        private _mediaObserver: MediaObserver,
        private _notification: NotificationService,
        private _router: Router,
        private _route: ActivatedRoute
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;
        this.filterByParent = false;
        this.showReversed = false;

        this.pageSize = this._financeAccountTransactionService.defaultPageSize;
        this.pageIndex = this._financeAccountTransactionService.defaultPageIndex;
        this.pageSizeOptions = this._financeAccountTransactionService.defaultPageSizeOptions;

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

        this._logger.debug('finance account transaction list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._financeAccountTransactionService
            .onFinanceAccounTransactionsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[finance_account_transactions]', response);

                this.financeAccountTransactionList = response.items;
                this.total = response.totalDisplay;
                // this.searchInput[(response.total < 1 || (response.filtered && response.totalDisplay < 1)) ? 'disable' : 'enable']({ emitEvent: false });

                // reset search
                // if (response.total < 1 || (response.filtered && response.totalDisplay < 1)) { this.clearSearch(null, false); }

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
                    this._financeAccountTransactionService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._financeAccountTransactionService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._financeAccountTransactionService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._financeAccountTransactionService.defaultPageIndex;
            });

        // Subscribe to parent filter changes
        this._financeAccountTransactionService.onFilterByParent
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.filterByParent = value;
            })

        this._financeAccountTransactionService.onFilterShowReversed
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.showReversed = value;
            })
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
            this.pageIndex = this._financeAccountTransactionService.defaultPageIndex;
        }

        this._financeAccountTransactionService.onPaginationChanged.next({
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

        this._financeAccountTransactionService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    goToChildPage(event: MouseEvent, id: string): void {
        this._router.navigate(['/manage-children/child', id]);
    }

    refundTransaction(event: MouseEvent, paymentId: string): void {

        event.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to refund this payment?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                payment_id: paymentId
                            };

                            this._logger.debug('[postObj', sendObj);

                            this.tableLoading = true;

                            this._financeService
                                .refundPayment(sendObj)
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
                                            this.onTableChange();
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

    reloadTable(event: MouseEvent): void {

        event.preventDefault();

        this.onTableChange();

    }

}

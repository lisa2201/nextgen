import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { PaymentHistoriesService } from '../services/payment-histories.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as _ from 'lodash';
import { PaymentHistory } from '../payment-history.model';

@Component({
    selector: 'app-payment-histories-list-view',
    templateUrl: './payment-histories-list-view.component.html',
    styleUrls: ['./payment-histories-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PaymentHistoriesListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    paymentHistoriesList: PaymentHistory[] = [];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;

    mapOfSort: { [key: string]: any } = {
        number: null,
        reference: null,
        date: null,
        amount: null,
        status: null
    };

    filterValue: any = null;

    searchInput: FormControl;

    @Output()
    updateTableScroll: EventEmitter<any>;

    /**
     * Constructor
     * @param {NGXLogger} _logger 
     * @param {PaymentHistoriesService} _paymentHistoriesService
     * @param {FuseSidebarService} _fuseSidebarService 
     * @param {MediaObserver} _mediaObserver 
     * @param {ActivatedRoute} _route 
     * @param {Router} _router 
     */
    constructor(
        private _logger: NGXLogger,
        private _paymentHistoriesService: PaymentHistoriesService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._paymentHistoriesService.defaultPageSize;
        this.pageIndex = this._paymentHistoriesService.defaultPageIndex;
        this.pageSizeOptions = this._paymentHistoriesService.defaultPageSizeOptions;

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

        this._logger.debug('payment history list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._paymentHistoriesService
            .onPaymentHistoryChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[payment_histories]', response);

                this.paymentHistoriesList = response.items;
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
                    this._paymentHistoriesService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._paymentHistoriesService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._paymentHistoriesService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._paymentHistoriesService.defaultPageIndex;
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
            this.pageIndex = this._paymentHistoriesService.defaultPageIndex;
        }

        this._paymentHistoriesService.onPaginationChanged.next({
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

        this._paymentHistoriesService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }


}

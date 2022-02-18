import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { BalanceAdjustmentsService } from '../services/balance-adjustments.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as _ from 'lodash';
import { BalanceAdjustment } from '../balance-adjustment.model';

@Component({
    selector: 'app-balance-adjustments-list-view',
    templateUrl: './balance-adjustments-list-view.component.html',
    styleUrls: ['./balance-adjustments-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})

export class BalanceAdjustmentsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    balanceAdjustmentsList: BalanceAdjustment[] = [];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;

    mapOfSort: { [key: string]: any } = {
        date: null,
        parent: null,
        amount: null,
        description: null,
        type: null,
        created_at: null
    };

    filterValue: any = null;
    searchInput: FormControl;

    @Output()
    updateTableScroll: EventEmitter<any>;


    /**
     * constructor
     * @param {NGXLogger} _logger 
     * @param {BalanceAdjustmentsService} _balanceAdjustmentsService 
     * @param {FuseSidebarService} _fuseSidebarService 
     * @param {MediaObserver} _mediaObserver 
     */
    constructor(
        private _logger: NGXLogger,
        private _balanceAdjustmentsService: BalanceAdjustmentsService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._balanceAdjustmentsService.defaultPageSize;
        this.pageIndex = this._balanceAdjustmentsService.defaultPageIndex;
        this.pageSizeOptions = this._balanceAdjustmentsService.defaultPageSizeOptions;

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

        this._logger.debug('balance adjustments list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._balanceAdjustmentsService
            .onBalanceAdjustmentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[balance_adjustments]', response);

                this.balanceAdjustmentsList = response.items;
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
                    this._balanceAdjustmentsService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._balanceAdjustmentsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._balanceAdjustmentsService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._balanceAdjustmentsService.defaultPageIndex;
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
            this.pageIndex = this._balanceAdjustmentsService.defaultPageIndex;
        }

        this._balanceAdjustmentsService.onPaginationChanged.next({
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

        this._balanceAdjustmentsService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    reloadTable(): void {
        this.onTableChange(false);
    }

}

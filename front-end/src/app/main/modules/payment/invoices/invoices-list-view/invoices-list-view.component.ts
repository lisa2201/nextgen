import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, Route } from '@angular/router';
import { FormControl } from '@angular/forms';
import { MediaObserver, MediaChange } from '@angular/flex-layout';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import * as _ from 'lodash';

import { AuthService } from 'app/shared/service/auth.service';
import { InvoicesService } from '../services/invoices.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { SubscriberInvoice } from '../models/invoice.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'app-invoices-list-view',
    templateUrl: './invoices-list-view.component.html',
    styleUrls: ['./invoices-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InvoicesListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    
    invoicesList: SubscriberInvoice[];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;

    mapOfSort: { [key: string]: any } = {
        number: null,
        start_date: null,
        end_date_date: null,
        due_date: null,
        subtotal: null,
        status: null
    };

    filterValue: any = null;

    searchInput: FormControl;

    dialogRef: any;
    confirmModal: NzModalRef;

    @Output()
    updateTableScroll: EventEmitter<any>;

    /**
     * Constructor
     * @param {NGXLogger} _logger 
     * @param {InvoicesService} _invoiceService 
     * @param {FuseSidebarService} _fuseSidebarService 
     * @param {MediaObserver} _mediaObserver 
     * @param {ActivatedRoute} _route 
     * @param {Router} _router 
     */
    constructor(
        private _logger: NGXLogger,
        private _invoiceService: InvoicesService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _route: ActivatedRoute,
        private _router: Router,
        private _notification: NotificationService
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._invoiceService.defaultPageSize;
        this.pageIndex = this._invoiceService.defaultPageIndex;
        this.pageSizeOptions = this._invoiceService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.invoicesList = [];
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('invoice list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to invoice list changes
        this._invoiceService
            .onInvoiceChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[invoices]', response);

                this.invoicesList = response.items;
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
                    this._invoiceService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._invoiceService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._invoiceService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._invoiceService.defaultPageIndex;
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
            this.pageIndex = this._invoiceService.defaultPageIndex;
        }

        this._invoiceService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * Load invoice
     * @param {Invoice} invoice 
     */
    loadInvoice(invoice: SubscriberInvoice): void {

        this._router.navigate([invoice.id], { relativeTo: this._route });

    }

    payInvoice(id: string, index: number): void {

        this.tableLoading = true;

        this._invoiceService.payInvoice(id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe((response: {message: string, success: boolean}) => {

                this.onTableChange();
                
                // if (response.success) { 
                //     this._notification.displaySnackBar(response.message, NotifyType.SUCCESS);
                //     this.invoicesList[index].setStatus('paid');
                // } else {
                //     this._notification.displaySnackBar(response.message, NotifyType.ERROR);
                //     this.invoicesList[index].setStatus('failed');
                // }

            });

    }

    getTotal(item: SubscriberInvoice): number {

        return item.subTotal + ((item.subTotal/100) * item?.organization?.taxPercentage);

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

        this._invoiceService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

}

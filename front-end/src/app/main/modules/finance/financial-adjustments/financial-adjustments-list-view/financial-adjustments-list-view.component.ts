import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { FinancialAdjustmentsService } from '../services/financial-adjustments.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { FinancialAdjustmentHeader } from '../financial-adjustment.model';
import { Router } from '@angular/router';
import { setDate } from 'date-fns';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { DatePipe } from '@angular/common';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-financial-adjustments-list-view',
    templateUrl: './financial-adjustments-list-view.component.html',
    styleUrls: ['./financial-adjustments-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancialAdjustmentsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    financialAdjustmentsList: FinancialAdjustmentHeader[] = [];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    confirmModal: NzModalRef;

    mapOfSort: { [key: string]: any } = {
        start_date: null,
        item: null,
        amount: null,
        type: null,
        created_at: null
    };

    filterValue: any = null;

    searchInput: FormControl;

    @Output()
    updateTableScroll: EventEmitter<any>;
    expandSet = new Set<any>();


    constructor(
        private _logger: NGXLogger,
        private _financialAdjustmentsService: FinancialAdjustmentsService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _notification: NotificationService,
        private _router: Router,
        private _modalService: NzModalService,
        private _datePipe: DatePipe
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._financialAdjustmentsService.defaultPageSize;
        this.pageIndex = this._financialAdjustmentsService.defaultPageIndex;
        this.pageSizeOptions = this._financialAdjustmentsService.defaultPageSizeOptions;

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

        this._logger.debug('financial adjustments list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._financialAdjustmentsService
            .onFinancialAdjustmentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[financial_adjustments]', response);

                this.financialAdjustmentsList = response.items;
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
                    this._financialAdjustmentsService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._financialAdjustmentsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._financialAdjustmentsService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._financialAdjustmentsService.defaultPageIndex;
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
            this.pageIndex = this._financialAdjustmentsService.defaultPageIndex;
        }

        this._financialAdjustmentsService.onPaginationChanged.next({
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

        this._financialAdjustmentsService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    getChildNameList(list: any): string {

        const names = [];

        _.forEach(list, (val, index) => {
            names.push(val.child.f_name + ' ' + val.child.l_name);
        });

        return names.join(', ');

    }

    goToChildPage(event: MouseEvent, id: string): void {
        this._router.navigate(['/manage-children/child', id]);
    }

    deleteAdjustment(event: MouseEvent, id: string): void {

        event.preventDefault();

        const sendData = {
            id: id
        };

        this._financialAdjustmentsService.deleteAdjustment(sendData)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((message) => {

                this._notification.clearSnackBar();

                setTimeout(() => {
                    this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                    // this._financialAdjustmentsService.listFinancialAdjustments();
                    this.onTableChange(false);
                }, 200);

            });

    }

    reloadTable(): void {
        this.onTableChange(false);
    }

    getDate(data: FinancialAdjustmentHeader): string {

        if (data.startDate === data.endDate) {
            return this._datePipe.transform(data.startDate, 'mediumDate');
        } else {
            return `${this._datePipe.transform(data.startDate, 'mediumDate')} - ${this._datePipe.transform(data.endDate, 'mediumDate')}`;
        }

    }

    getDays(data: FinancialAdjustmentHeader): string {

        let days = '';

        if (data?.properties?.days) {

            days = _.join(_.map(_.filter(data.properties.days, (v: any) => v.value), (val: any) => DateTimeHelper.now().isoWeekday(val.index).format('dd')), '-');

        }

        return days;

    }

    reverseAdjustment(event: MouseEvent, id: string): void {

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure you want to reverse this adjustment?',
                    nzContent: 'Please be aware this operation cannot be undone. This will reverse the adjustment for all children linked to this adjustment. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                id: id
                            };

                            this._financialAdjustmentsService
                                .reverseAdjustment(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => {
                                            this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                                            this._financialAdjustmentsService.listFinancialAdjustments();
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

    getChildItems(data: FinancialAdjustmentHeader, initial: boolean): any {
        if (initial) {
            return _.take(data.details, 3);
        } else {
            return _.slice(data.details, 3, data.details.length);
        }
    }

    expandChildren(event: MouseEvent, id: string) {

        event.preventDefault();

        if (this.expandSet.has(id)) {
            this.expandSet.delete(id);
        } else {
            this.expandSet.add(id);
        }

    }

}

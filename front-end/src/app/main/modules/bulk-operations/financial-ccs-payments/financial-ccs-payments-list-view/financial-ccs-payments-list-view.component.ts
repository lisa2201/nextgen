import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { FinancialCcsPaymentsService } from '../services/financial-ccs-payments.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { CcsPaymentDetailDialogComponent } from '../dialogs/ccs-payment-detail-dialog/ccs-payment-detail-dialog.component';
import { CCSPayments } from '../financial-ccs-payments.model';
import { MediaChange, MediaObserver } from '@angular/flex-layout';

@Component({
    selector: 'app-financial-ccs-payments-list-view',
    templateUrl: './financial-ccs-payments-list-view.component.html',
    styleUrls: ['./financial-ccs-payments-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancialCcsPaymentsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    ccsPaymentsList: CCSPayments;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    sideBarName: string;

    dialogRef: any;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _financialCcsPaymentsService: FinancialCcsPaymentsService,
        private _fuseSidebarService: FuseSidebarService,
        private _matDialog: MatDialog,
        private _mediaObserver: MediaObserver
    ) {
        // set default values

        this.updateTableScroll = new EventEmitter();

        this.pageSizeChanger = true;
        this.pageSize = this._financialCcsPaymentsService.defaultPageSize;
        this.pageIndex = this._financialCcsPaymentsService.defaultPageIndex;
        this.pageSizeOptions = this._financialCcsPaymentsService.defaultPageSizeOptions;
        this.mobilePagination = false;
        this.sideBarName = 'finance-ccs-payments-sidebar';

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

        this._logger.debug('finance ccs payments list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._financialCcsPaymentsService
            .onCcsPaymentsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: {items: CCSPayments, totalDisplay: number, total: number}) => {
                this._logger.debug('[ccs_payments]', response);

                this.ccsPaymentsList = response.items ? response.items : {count: 0, results: []};
                this.total = response.total || 0;

                this.updateTableScroll.next();
            });

        // Subscribe to table loader changes
        this._financialCcsPaymentsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
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

    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._financialCcsPaymentsService.defaultPageIndex;
        }

        this._financialCcsPaymentsService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    openDetail(event: MouseEvent, data: any): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(CcsPaymentDetailDialogComponent,
                {
                    panelClass: 'ccs-payment-details-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {},
                        payment_detail: data
                    }
                });

    }

}

import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation, collapseOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { FinanceAccountPaymentsService } from '../services/finance-account-payments.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { FinanceAccountPayment } from '../finance-account-payment.model';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { FinanceAccountPaymentAdjustDialogComponent } from '../dialogs/finance-account-payment-adjust-dialog/finance-account-payment-adjust-dialog.component';
import { AuthService } from 'app/shared/service/auth.service';
import { Router } from '@angular/router';
import { FinancialPaymentDetailsDialogComponent } from '../../shared/dialogs/financial-payment-details-dialog/financial-payment-details-dialog.component';
import { FinanceService } from '../../shared/services/finance.service';

@Component({
    selector: 'app-finance-account-payments-list-view',
    templateUrl: './finance-account-payments-list-view.component.html',
    styleUrls: ['./finance-account-payments-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountPaymentsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    financeAccountPaymentsList: FinanceAccountPayment[] = [];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    dialogRef: any;
    parentLevel: boolean;

    mapOfSort: { [key: string]: any } = {
        name: null
    };

    isAllDisplayDataChecked = false;
    isIndeterminate = false;
    mapOfCheckedId: { [key: string]: boolean } = {};
    numberOfChecked = 0;

    filterValue: any = null;
    searchInput: FormControl;
    confirmModal: NzModalRef;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _financeAccountPaymentsService: FinanceAccountPaymentsService,
        private _financeService: FinanceService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _authService: AuthService,
        private _router: Router
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._financeAccountPaymentsService.defaultPageSize;
        this.pageIndex = this._financeAccountPaymentsService.defaultPageIndex;
        this.pageSizeOptions = this._financeAccountPaymentsService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();

        this.parentLevel = this._authService.isParent();

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

        this._logger.debug('finance account payments list view!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._financeAccountPaymentsService
            .onFinanceAccountPaymentsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[finance_account_payments]', response);

                this.financeAccountPaymentsList = response.items;
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
                    this._financeAccountPaymentsService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._financeAccountPaymentsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._financeAccountPaymentsService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._financeAccountPaymentsService.defaultPageIndex;
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
            this.pageIndex = this._financeAccountPaymentsService.defaultPageIndex;
        }

        this._financeAccountPaymentsService.onPaginationChanged.next({
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

        this._financeAccountPaymentsService.onSortChanged.next({
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

    rejectPayment(event: MouseEvent, paymentId: string): void {

        event.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure you want to reject this payment?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                payment_id: paymentId,
                                reject: true
                            };

                            this.tableLoading = true;

                            this._financeAccountPaymentsService
                                .updatePayment(sendObj)
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
                                            this._financeAccountPaymentsService.listFinanceAccountPayments();
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

    openAdjustPaymentDialog(event: MouseEvent, payment: FinanceAccountPayment): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
            .open(FinanceAccountPaymentAdjustDialogComponent,
                {
                    panelClass: 'financial-payment-adjustment-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {},
                        payment_id: payment.id,
                        amount: payment.amount
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
                    this.reloadTable();
                }, 200);

            });

    }

    openDetail(event: MouseEvent, id: string): void {

        event.preventDefault();

        const resObservable = forkJoin([
            this._financeService.getParentPaymentDetail(id)
        ]);

        this.tableLoading = true;

        resObservable
            .pipe(
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe(([detail]) => {

                this.dialogRef = this._matDialog
                    .open(FinancialPaymentDetailsDialogComponent,
                        {
                            panelClass: 'financial-payment-details-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                response: {},
                                payment_detail: detail
                            }
                        });

            });

    }


    refundPayment(event: MouseEvent, paymentId: string): void {

        event.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure you want to refund this payment?',
                    nzContent: 'Please be aware this operation cannot be reversed. This will only reverse the payment from Kinder M8 transaction. This operation will not refund using payment gateway, refund of the actual amount has to be done manually. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {

                            const sendObj = {
                                payment_id: paymentId
                            };

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
                                            this._financeAccountPaymentsService.listFinanceAccountPayments();
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

    retryPayment(event: MouseEvent, paymentId: string): void {

        event.preventDefault();

        const sendObj = {
            id: paymentId
        };

        this.tableLoading = true;

        this._financeService
            .retryPayment(sendObj)
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
                        this._financeAccountPaymentsService.listFinanceAccountPayments();
                    }, 200);
                },
                error => {
                    throw error;
                }
            );

    }

    goToChildPage(event: MouseEvent, id: string): void {
        this._router.navigate(['/manage-children/child', id]);
    }

    getPaymentMethod(data: FinanceAccountPayment): string {
        return data.status !== 'approved' ? this._financeService.getManualPaymentMapDesc(data, false) : '';
    }

    getStatusConfig(data: FinanceAccountPayment): {color: string, tooltip: string} {

        let desc: {color: string, tooltip: string};

        switch (data.status) {
            case 'approved':
                desc = {
                    color: 'blue',
                    tooltip: 'Kinder M8 generated payment ready to be submitted to ezidebit'
                };
                break;
            case 'pending':
                desc = {
                    color: 'purple',
                    tooltip: 'Payment is submitted to ezidebit and ezidebit has scheduled to submit the payment to relevant bank'
                };
                break;
            case 'submitted':
                desc = {
                    color: 'geekblue',
                    tooltip: 'Ezidebit has submitted the payment to the bank for processing'
                };
                break;
            case 'completed':
                desc = {
                    color: 'green',
                    tooltip: 'Payment transaction is completed'
                };
                break;
            case 'rejected_gateway':
                desc = {
                    color: 'red',
                    tooltip: 'Ezidebit/Financial institution has rejected the payment'
                };
                break;
            case 'rejected_user':
                desc = {
                    color: 'red',
                    tooltip: 'Kinder M8 user has rejected the payment when payment is in approved status'
                };
                break;
            case 'inactive':
                desc = {
                    color: 'red',
                    tooltip: 'Kinder M8 user has rejected the payment when payment is in approved status'
                };
                break;
            case 'refund_success':
                desc = {
                    color: 'cyan',
                    tooltip: 'Payment refund successful'
                };
                break;
            case 'refund_failed':
                desc = {
                    color: 'red',
                    tooltip: 'Payment refund failed'
                };
                break;

            default:
                desc = {
                    color: '',
                    tooltip: ''
                };
                break;

        }

        return desc;

    }


}

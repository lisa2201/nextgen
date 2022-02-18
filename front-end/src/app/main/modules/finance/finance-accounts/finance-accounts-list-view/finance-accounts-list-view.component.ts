import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { FinanceAccountsService } from '../services/finance-accounts.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { FinanceAccount } from '../finance-account.model';
import { FinanceService } from '../../shared/services/finance.service';
import { AddFinancialAdjustmentDialogComponent } from '../../shared/dialogs/add-financial-adjustment-dialog/add-financial-adjustment-dialog.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { OneTimeScheduledPaymentDialogComponent } from '../../shared/dialogs/one-time-scheduled-payment-dialog/one-time-scheduled-payment-dialog.component';
import { FinanceAddManualPaymentComponent } from '../../shared/dialogs/finance-add-manual-payment/finance-add-manual-payment.component';
import { Router } from '@angular/router';
import { GenerateEntitlementStatementDialogComponent } from '../../shared/dialogs/generate-entitlement-statement-dialog/generate-entitlement-statement-dialog.component';
import { GenerateParentStatementDialogComponent } from '../../shared/dialogs/generate-parent-statement-dialog/generate-parent-statement-dialog.component';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { BondPayment } from '../../bond-payment/model/bond-payment.model';
import { FinancePaymentPlan } from '../finance-payment-plan.model';
import { CurrencyPipe } from '@angular/common';
import { WaiveFeeDialogComponent } from '../../shared/dialogs/waive-fee-dialog/waive-fee-dialog.component';
import { BulkToggleAutoChargeDialogComponent } from '../../shared/dialogs/bulk-toggle-auto-charge-dialog/bulk-toggle-auto-charge-dialog.component';

@Component({
    selector: 'app-finance-accounts-list-view',
    templateUrl: './finance-accounts-list-view.component.html',
    styleUrls: ['./finance-accounts-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountsListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    financeAccountsList: FinanceAccount[] = [];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    dialogRef: any;
    hasEzidebit: boolean;
    buttonLoader: boolean;

    mapOfSort: { [key: string]: any } = {
        name: null,
        account_balance: null
    };

    isAllDisplayDataChecked = false;
    isIndeterminate = false;
    mapOfCheckedId: { [key: string]: boolean } = {};
    numberOfChecked = 0;
    confirmModal: NzModalRef;
    billingTermDescriptionMap: any;

    filterValue: any = null;
    searchInput: FormControl;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _financeAccountsService: FinanceAccountsService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _financeService: FinanceService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _router: Router,
        private _currencyPipe: CurrencyPipe
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;
        this.buttonLoader = false;
        this.billingTermDescriptionMap = {};

        this.hasEzidebit = false;
        this.pageSize = this._financeAccountsService.defaultPageSize;
        this.pageIndex = this._financeAccountsService.defaultPageIndex;
        this.pageSizeOptions = this._financeAccountsService.defaultPageSizeOptions;

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

        this._logger.debug('finance accounts list view!');



        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to payment history list changes
        this._financeAccountsService
            .onFinanceAccountsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[finance_accounts]', response);

                this.financeAccountsList = response.items;
                this.total = response.totalDisplay;
                this.hasEzidebit = response.hasEzidebit;
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
                    this._financeAccountsService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._financeAccountsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        this._financeAccountsService
            .onDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;
            });

        // Subscribe to filter changes
        this._financeAccountsService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._financeAccountsService.defaultPageIndex;
            });
            
        this.billingTermDescriptionMap = this._financeService.getBillingTermDescriptionMap();
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
            this.pageIndex = this._financeAccountsService.defaultPageIndex;
        }

        this._financeAccountsService.onPaginationChanged.next({
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

        this._financeAccountsService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    downloadBalanceReport(event: MouseEvent, data: FinanceAccount): void {
        this._logger.debug('Download report');
    }

    openAddAdjustmentDialog(event: MouseEvent, parentId: string): void {

        event.preventDefault();

        this.tableLoading = true;

        const resObservable = forkJoin([
            this._financeService.getFinancialAdjustmentChildrenList(null, parentId),
            this._financeService.getAdjustmentListItems()
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe(([children, items]) => {

                this.dialogRef = this._matDialog
                    .open(AddFinancialAdjustmentDialogComponent,
                        {
                            panelClass: 'add-financial-adjustment-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                children: children,
                                singleParent: true,
                                parentId: parentId,
                                items: items,
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
                            this.onTableChange(false);
                        }, 200);

                    });
            });


    }

    openAddPaymentDialog(event: MouseEvent, parentId: string): void {

        event.preventDefault();

        this.tableLoading = true;

        const resObservable = forkJoin([
            this._financeService.getAccountBalance(parentId),
            this._financeService.getActivePaymentMethod(parentId)
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe(([balance, paymentMethod]) => {

                this.dialogRef = this._matDialog
                    .open(FinanceAddManualPaymentComponent,
                        {
                            panelClass: 'add-financial-manual-payment-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                response: {},
                                user_id: parentId,
                                amount_due: balance,
                                payment_method: paymentMethod,
                                singleParent: true
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
            });


    }

    openEntitlementStatementGenerationDialog(event: MouseEvent, parentId: string): void {

        event.preventDefault();

        this.tableLoading = true;

        const resObservable = forkJoin([
            this._financeService.getEntitlementGenerationDependency(parentId)
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe(([children]) => {

                this.dialogRef = this._matDialog
                    .open(GenerateEntitlementStatementDialogComponent,
                        {
                            panelClass: 'generate-entitlement-statement-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                response: {},
                                user_id: parentId,
                                singleParent: true,
                                children: children
                            }
                        });

                this.dialogRef
                    .afterClosed()
                    .subscribe((message: string) => {

                        if (!message) {
                            return;
                        }

                    });
            });


    }

    openParentStatementGenerateDialog(event: MouseEvent, parentId: string): void {

        this.dialogRef = this._matDialog
            .open(GenerateParentStatementDialogComponent,
                {
                    panelClass: 'generate-parent-statement-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {},
                        user_id: parentId
                    }
                });

        this.dialogRef
            .afterClosed()
            .subscribe((message: string) => {

                if (!message) {
                    return;
                }

            });

    }

    openAddScheduledPaymentDialog(event: MouseEvent, parentId: string): void {

        event.preventDefault();

        this.tableLoading = true;

        const resObservable = forkJoin([
            this._financeService.getAccountBalance(parentId)
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe(([balance]) => {

                this.dialogRef = this._matDialog
                    .open(OneTimeScheduledPaymentDialogComponent,
                        {
                            panelClass: 'one-time-scheduled-payment-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                response: {},
                                singleParent: true,
                                user_id: parentId,
                                amount_due: balance
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
                        }, 200);

                    });
            });


    }

    /**
     * Reload table
     */
    reloadTable(): void {
        this.onTableChange(false);
    }

    checkAll(value: boolean): void {
        this.financeAccountsList.forEach(item => (this.mapOfCheckedId[item.id] = value));
        this.refreshStatus();
    }

    refreshStatus(): void {
        this.isAllDisplayDataChecked = this.financeAccountsList.every(item => this.mapOfCheckedId[item.id]);
        this.isIndeterminate = this.financeAccountsList.some(item => this.mapOfCheckedId[item.id]) && !this.isAllDisplayDataChecked;
        // this.numberOfChecked = this.financeAccountsList.filter(item => this.mapOfCheckedId[item.id]).length; // For counter reset when page change
        this.numberOfChecked = _.filter(this.mapOfCheckedId, val => val).length;
    }

    currentPageDataChange(data: FinanceAccount[]): void {
        setTimeout(() => this.refreshStatus(), 300);
    }

    goToChildPage(event: MouseEvent, id: string): void {
        this._router.navigate(['/manage-children/child', id]);
    }

    sendEzidebitEmail(event: MouseEvent, id: string): void {

        event.preventDefault();

        this.tableLoading = true;

        const sendData = {
            id: id
        };

        this._financeAccountsService.emailEzidebitLink(sendData)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.tableLoading = false;
                })
            )
            .subscribe(message => {
                
                setTimeout(() => {
                    this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                }, 200);

            })

    }

    bulkMailLink(event: MouseEvent): void {

        event.preventDefault();

        this.confirmModal = this._modalService
            .confirm({
                nzTitle: 'Warning',
                nzContent: 'This operation will email ezidebit registration link to the selected parents who do not have active payment method. Are you sure you want to continue?',
                nzWrapClassName: 'vertical-center-modal',
                nzOkText: 'Continue',
                nzOkType: 'primary',
                nzOnOk: () => {
                    return new Promise((resolve, reject) => {

                        this.buttonLoader = true;

                        const sendData = {
                            ids: _.filter(_.map(this.mapOfCheckedId, (val, index) => val === true ? index : null), (val) => val !== null)
                        }
                
                        this._financeAccountsService.bulkeEmailEzidebitLink(sendData)
                            .pipe(
                                takeUntil(this._unsubscribeAll),
                                finalize(() => {
                                    this.buttonLoader = false;
                                    resolve();
                                })
                            )
                            .subscribe(
                                (message) => {
                                    setTimeout(() => {
                                        this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                                    }, 200);
                                },
                                (error) => {
                                    throw error;
                                });

                    });
                }
            });
        
    }

    getActiveSchedule(data: FinanceAccount): string {
        if (data.activePaymentSchedule) {
            return `${_.capitalize(data.activePaymentSchedule?.paymentFrequency)} on ${data.activePaymentSchedule?.paymentDay}`;
        } else {
            return 'No';
        }
    }

    getActivePaymentMethod(data: FinanceAccount): string {
        if (data.activePaymentMethod) {

            if (data.activePaymentMethod.type === 'bpay') {
                return `BPAY CRN: ${data.activePaymentMethod.reference}`;
            } else {
                return data.activePaymentMethod.instrument;
            }

        } else {
            return 'No';
        }
    }

    getTotalNetBond(bond: BondPayment[]): number
    {
        
        return _.sum(_.map(bond, (val) => val.type === 'Receiving' ? parseFloat(val.amount) : (parseFloat(val.amount) * -1)));
        
    }

    getLimitText(user: FinanceAccount): string {
        
        let text = '';

        if (user.activePaymentSchedule) {

            if (user.activePaymentSchedule?.amountLimit) {
                text = `Amount limit is set (${this._currencyPipe.transform(user.activePaymentSchedule?.amountLimit)}).`;
            }

            if (user.activePaymentSchedule?.fixedAmount) {
                text = `Fixed amount is set (${this._currencyPipe.transform(user.activePaymentSchedule?.fixedAmount)})`;
            }

        }

        return text;
    }

    openWaiveFeeDialog(event: MouseEvent): void {

        event.preventDefault();

        this.buttonLoader = true;

        forkJoin([
            this._financeService.getWaiveFeeUsers(this.filterValue)
        ])
        .pipe(
            takeUntil(this._unsubscribeAll),
            finalize(() => {
                this.buttonLoader = false;
            })
        )
        .subscribe(([users]) => {

            this.dialogRef = this._matDialog
                .open(WaiveFeeDialogComponent,
                    {
                        panelClass: 'financial-payment-waive-dialog',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            response: {},
                            selected_parents: _.filter(_.map(this.mapOfCheckedId, (val, index) => val === true ? index : null), (val) => val !== null),
                            parents: users
                        }
                    });

            this.dialogRef
                .afterClosed()
                .subscribe((message: string) => {

                    if (!message) {
                        return;
                    }

                    this.reloadTable();

                });

        });


    }

    openToggleAutoChargeDialog(event: MouseEvent): void {

        event.preventDefault();

        this.buttonLoader = true;

        forkJoin([
            this._financeService.getWaiveFeeUsers(this.filterValue)
        ])
        .pipe(
            takeUntil(this._unsubscribeAll),
            finalize(() => {
                this.buttonLoader = false;
            })
        )
        .subscribe(([users]) => {

            this.dialogRef = this._matDialog
                .open(BulkToggleAutoChargeDialogComponent,
                    {
                        panelClass: 'bulk-toggle-auto-charge-dialog',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            response: {},
                            selected_parents: _.filter(_.map(this.mapOfCheckedId, (val, index) => val === true ? index : null), (val) => val !== null),
                            parents: users
                        }
                    });


            this.dialogRef
                .afterClosed()
                .subscribe((message: string) => {

                    if (!message) {
                        return;
                    }

                    this.reloadTable();

                });


        });

    }

}

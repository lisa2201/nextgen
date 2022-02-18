import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { FinanceAccountPaymentsService } from './services/finance-account-payments.service';
import { CommonService } from 'app/shared/service/common.service';
import { FinanceService } from '../shared/services/finance.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { OneTimeScheduledPaymentDialogComponent } from '../shared/dialogs/one-time-scheduled-payment-dialog/one-time-scheduled-payment-dialog.component';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { FinanceAddManualPaymentComponent } from '../shared/dialogs/finance-add-manual-payment/finance-add-manual-payment.component';

@Component({
    selector: 'app-finance-account-payments',
    templateUrl: './finance-account-payments.component.html',
    styleUrls: ['./finance-account-payments.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountPaymentsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    manualLoader: boolean;
    syncLoader: boolean; 
    dialogRef: any;
    infoMessage: string;
    warnMessage: string;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;
    
    /**
     * constructor
     * @param {CommonService} _commonService 
     * @param {FinanceAccountPaymentsService} _financeAccountPaymentService
     */
    constructor(
        private _commonService: CommonService,
        private _financeAccountPaymentService: FinanceAccountPaymentsService,
        private _financeService: FinanceService,
        private _matDialog: MatDialog,
        private _notification: NotificationService
    ) {
        this._unsubscribeAll = new Subject();

        this.buttonLoader = false;
        this.syncLoader = false;
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.infoMessage = `Daily at 11:00 AM (AEST), the system will generate payment for the day. This is based on the payment day and payment frequency configured for the payment plan. The payment is generated with 'Approved' status by default. Daily at 02:45 PM (AEST), the system will submit payments to ezidebit for processing. For Direct Debit, it may take 3 to 5 bussiness days to process a payment. The system checks with ezidebit payment status changes every day at 12:00 PM (AEST) and  08:30 PM (AEST).`;
        this.warnMessage = `System automatically generates payments for users with active payment plan and auto charge enabled. Disabling the auto charge after payment is generated with "Approved" status will not stop the system from submitting the generated payment to payment gateway. The user should take action to reject the payment before 02:45 PM (AEST). Only users with active payment method will be processed.`;
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._financeAccountPaymentService.unsubscribeOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.triggerResize();
    }

    /**
     * Open One time payment dialog
     * @param {MouseEvent} event
     */
    openOneTimePaymentDialog(event: MouseEvent, parentId: string): void {

        event.preventDefault();

        const resObservable = forkJoin([
            this._financeService.getParentList(),
        ]);

        this.buttonLoader = true;

        resObservable
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe(([parents]) => {

                this.dialogRef = this._matDialog
                    .open(OneTimeScheduledPaymentDialogComponent,
                        {
                            panelClass: 'one-time-scheduled-payment-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                parents: parents,
                                singleParent: false,
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
                            this._financeAccountPaymentService.listFinanceAccountPayments();
                        }, 200);

                    });
            });

    }

    addManualPayment(event: MouseEvent): void {
        
        event.preventDefault();

        this.manualLoader = true;

        const resObservable = forkJoin([
            this._financeService.getParentList()
        ]);

        resObservable
            .pipe(
                finalize(() => {
                    this.manualLoader = false;
                })
            )
            .subscribe(([parents]) => {

                this.dialogRef = this._matDialog
                    .open(FinanceAddManualPaymentComponent,
                        {
                            panelClass: 'add-financial-manual-payment-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                response: {},
                                parents: parents
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
                            this._financeAccountPaymentService.listFinanceAccountPayments();
                        }, 200);

                    });
            });

    }

    syncPaymentStatus(event: MouseEvent): void {

        event.preventDefault();

        this.syncLoader = true;

        this._financeAccountPaymentService.syncPaymentStatus()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.syncLoader = false;
                })
            )
            .subscribe((message: string) => {
                setTimeout(() => {
                    this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                }, 200);
            });

    }
    
}

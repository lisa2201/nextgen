import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FinanceAccountPaymentsService } from '../../services/finance-account-payments.service';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
    selector: 'app-finance-account-payment-adjust-dialog',
    templateUrl: './finance-account-payment-adjust-dialog.component.html',
    styleUrls: ['./finance-account-payment-adjust-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class FinanceAccountPaymentAdjustDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    paymentAdjustmentForm: FormGroup;
    buttonLoading: boolean;
    paymentId: string;
    amount: number;

    constructor(
        public matDialogRef: MatDialogRef<FinanceAccountPaymentAdjustDialogComponent>,
        private _formBuilder: FormBuilder,
        private _financeAccountPaymentService: FinanceAccountPaymentsService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.paymentId = this._data.payment_id;
        this.amount = this._data.amount;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.createForm();

    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Create form
     */
    createForm(): void {

        this.paymentAdjustmentForm = this._formBuilder.group({
            amount: new FormControl(this.amount ? this.amount : null, [Validators.required]),
            comments: new FormControl(null),
        });

    }

    get fc(): any {
        return this.paymentAdjustmentForm.controls;
    }

    /**
     * on submit
     */
    onSubmit(): void {

        if (this.paymentAdjustmentForm.invalid) {
            return;
        }

        const sendObj = {
            amount: this.fc.amount.value,
            payment_id: this.paymentId,
            comments: this.fc.comments.value
        };

        this.buttonLoading = true;

        this._financeAccountPaymentService.updatePayment(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {
                setTimeout(() => this.matDialogRef.close(response), 250);
            });

    }

}

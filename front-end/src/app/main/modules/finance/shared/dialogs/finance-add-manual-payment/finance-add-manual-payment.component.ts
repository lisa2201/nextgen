import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject, concat, forkJoin, ObservableInput, Observable, of } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { takeUntil, finalize, concatMap, flatMap, switchMap } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { FinanceService } from '../../services/finance.service';
import { User } from 'app/main/modules/user/user.model';
import * as _ from 'lodash';

interface ManualPaymentMethods {
    name: string;
    value: string;
}

@Component({
    selector: 'app-finance-add-manual-payment',
    templateUrl: './finance-add-manual-payment.component.html',
    styleUrls: ['./finance-add-manual-payment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class FinanceAddManualPaymentComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    manualPaymentForm: FormGroup;
    buttonLoading: boolean;
    singleParentMode: boolean;

    paymentMethods: ManualPaymentMethods[];
    userId: string | null;
    amountDue: number;
    parentsList: User[] | null;
    paymentMethod: any | null;

    constructor(
        public matDialogRef: MatDialogRef<FinanceAddManualPaymentComponent>,
        private _formBuilder: FormBuilder,
        private _financeService: FinanceService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.singleParentMode = this._data.singleParent;
        this.userId = this._data.user_id ? this._data.user_id : null;
        this.amountDue = this._data.amount_due ? this._data.amount_due : 0;
        this.parentsList = this._data.parents ? this._data.parents : null;
        this.paymentMethod = this._data.payment_method ? this._data.payment_method : null;
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.paymentMethods = [
            {
                name: 'Cash',
                value: 'cash'
            },
            {
                name: 'Cheque',
                value: 'cheque'
            },
            {
                name: 'Direct Deposit',
                value: 'direct_deposit'
            },
            {
                name: 'EFTPOS',
                value: 'fpos'
            }
        ];

        this.createForm();

        // this.handlePaymentmethods();

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

        this.manualPaymentForm = this._formBuilder.group({
            user: new FormControl(null, [Validators.required]),
            date: new FormControl(null, [Validators.required]),
            payment_method: new FormControl(null, [Validators.required]),
            comments: new FormControl(''),
            amount: new FormControl(null, [Validators.required, Validators.min(0)]),
        });

        if (this.singleParentMode) {
            this.manualPaymentForm.get('user').disable();
        } else {
            // this.manualPaymentForm.get('user').valueChanges
            //     .pipe(
            //         takeUntil(this.unsubscribeAll),
            //         switchMap((value: any, index: number): ObservableInput<any> => {
            //             if (value) {
            //                 return forkJoin([this._financeService.getAccountBalance(value), this._financeService.getActivePaymentMethod(value)]);
            //             } else {
            //                 return forkJoin([of(0), of(null)]);
            //             }
            //         })
            //     )
            //     .subscribe(([amount, paymentMethod]) => {
            //         this.amountDue = amount;

            //         this.paymentMethod = paymentMethod;
            //         this.handlePaymentmethods();
            //     });
        }

        this.manualPaymentForm.get('payment_method')
            .valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value) => {
                
                const dateInput = this.manualPaymentForm.get('date');

                if (value === 'configured_payment') {
                    dateInput.disable();    
                } else {
                    dateInput.enable();
                }

            })

    }

    get fc(): any {
        return this.manualPaymentForm.controls;
    }

    handlePaymentmethods(): void {

        this.manualPaymentForm.get('payment_method').patchValue(null, {emitEvent: false});
                    
        // if (this.paymentMethod) {
        //     this.paymentMethods.push({name:'Direct Debit/ Credit Card', value: 'configured_payment'});
        // } else {

        //     const ind = _.findIndex(this.paymentMethods, {value: 'configured_payment'});
            
        //     if (ind !== -1) {
        //         this.paymentMethods.splice(ind, 1);
        //     }

        // }

    }

    /**
     * on submit
     */
    onSubmit(): void {

        if (this.manualPaymentForm.invalid) {
            return;
        }

        const sendObj = {
            date: DateTimeHelper.getUtcDate(this.fc.date.value),
            payment_method: this.fc.payment_method.value,
            comments: this.fc.comments.value,
            amount: this.fc.amount.value,
            user_id: this.userId ? this.userId : this.fc.user.value
        };

        this.buttonLoading = true;

        this._financeService.addManualPayment(sendObj)
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

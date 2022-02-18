import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { FinanceService } from '../../services/finance.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { takeUntil, finalize, debounceTime } from 'rxjs/operators';
import { User } from 'app/main/modules/user/user.model';
import { differenceInCalendarDays } from 'date-fns';

@Component({
    selector: 'app-one-time-scheduled-payment-dialog',
    templateUrl: './one-time-scheduled-payment-dialog.component.html',
    styleUrls: ['./one-time-scheduled-payment-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class OneTimeScheduledPaymentDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    paymentForm: FormGroup;
    buttonLoading: boolean;
    userId: string | null;
    amountDue: number | null;
    singleParentMode: boolean;
    parentList: User[];
    amountDueLoader: boolean;
    today: any;

    constructor(
        public matDialogRef: MatDialogRef<OneTimeScheduledPaymentDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _logger: NGXLogger,
        private _financialService: FinanceService
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.today = new Date();

        this.singleParentMode = this._data.singleParent ? this._data.singleParent : false;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        if (this.singleParentMode) { 
            // Expect userId and amountDue

            this.userId = this._data.user_id;
            this.amountDue = this._data.amount_due;

        } else {
            // Expect parent list

            this.parentList = this._data.parents;
            this.amountDue = 0;

        }

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

        this.paymentForm = this._formBuilder.group({
            parent: new FormControl(null, Validators.required),
            date: new FormControl('', [Validators.required]),
            amount: new FormControl('', [Validators.required, Validators.min(0)]),
            comments: new FormControl('')
        });

        if (!this.singleParentMode) {

            this.paymentForm.get('parent').valueChanges
                .pipe(
                    debounceTime(1000),
                    takeUntil(this.unsubscribeAll)
                )
                .subscribe((value) => {

                    if (value) {
                        this.getAccountBalance(value);
                    } else {
                        this.amountDue = 0;
                    }

                });

        } else {
            this.paymentForm.get('parent').disable();
        }

    }

    get fc(): any {
        return this.paymentForm.controls;
    }

    disabledDate = (current: Date): boolean => {
        // Can not select days before today and today
        return differenceInCalendarDays(current, this.today) <= 0;
    }

    getAccountBalance(parentId: string): void {

        this.amountDueLoader = true;
        const parentSelect = this.paymentForm.get('parent');
        parentSelect.disable({emitEvent: false});

        this._financialService.getAccountBalance(parentId)
            .pipe(
                takeUntil(this.unsubscribeAll), 
                finalize(() => {
                    this.amountDueLoader = false;
                    parentSelect.enable({emitEvent: false});
                })
            )
            .subscribe((response) => {
                this.amountDue = response;
            });

    }

    onSubmit(): void {

        if (this.paymentForm.invalid) {
            return;
        }

        const sendObj = {
            date: DateTimeHelper.getUtcDate(this.fc.date.value),
            amount: this.fc.amount.value,
            comments: this.fc.comments.value,
            user_id: this.singleParentMode ? this.userId : this.fc.parent.value
        };
        
        this.buttonLoading = true;        

        this._financialService.addOneTimeScheduledPayment(sendObj)
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

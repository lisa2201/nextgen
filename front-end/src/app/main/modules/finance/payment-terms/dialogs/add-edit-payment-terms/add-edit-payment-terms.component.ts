import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { differenceInCalendarDays } from 'date-fns';
import { helpMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { PaymentTerm } from '../../payment-terms.model';
import { PaymentTermsService } from '../../services/payment-terms.service';

@Component({
    selector: 'app-add-edit-payment-terms',
    templateUrl: './add-edit-payment-terms.component.html',
    styleUrls: ['./add-edit-payment-terms.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class AddEditPaymentTermsComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    paymentTermForm: FormGroup;
    buttonLoading: boolean;
    editMode: boolean;
    editData: PaymentTerm;
    title: string;
    today = new Date();

    constructor(
        public matDialogRef: MatDialogRef<AddEditPaymentTermsComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _paymentTermsService: PaymentTermsService
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        
        if (this._data.term) {
            this.editData = this._data.term;
            this.editMode = true;
            this.title = 'Edit Payment Term';
        } else {
            this.editMode = false;
            this.editData = null;
            this.title = 'Add Payment Term';
        }

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

        this.paymentTermForm = this._formBuilder.group({
            name: new FormControl(this.editMode ? this.editData.name : null, [Validators.required]),
            start_date: new FormControl(this.editMode ? this.editData.startDate : null, [Validators.required]),
            end_date: new FormControl(this.editMode ? this.editData.endDate : null, [Validators.required]),
            transaction_date: new FormControl(this.editMode ? this.editData.transactionGenerationDate : null, [Validators.required]),
            payment_date: new FormControl(this.editMode ? this.editData.paymentGenerationDate : null)
        });

        this.paymentTermForm.get('start_date')
            .valueChanges
            .pipe(
                takeUntil(this.unsubscribeAll)
            )
            .subscribe((value) => {
                this.paymentTermForm.get('end_date').reset();
            });

        this.paymentTermForm.get('transaction_date')
            .valueChanges
            .pipe(
                takeUntil(this.unsubscribeAll)
            )
            .subscribe((value) => {
                this.paymentTermForm.get('payment_date').reset();
            });

    }

    get fc(): any {
        return this.paymentTermForm.controls;
    }

    disabledDate = (current: Date): boolean => {
        // Can not select days before start date

        const startDate = this.paymentTermForm.get('start_date').value;

        if (startDate) {
            return DateTimeHelper.parseMoment(current).isSameOrBefore(DateTimeHelper.parseMoment(startDate));
        } else {
            return false;
        }

    }

    disabledTransactionDate = (current: Date): boolean => {

        return differenceInCalendarDays(current, this.today) < 0;

    }

    disabledPaymentDate = (current: Date): boolean => {

        const transactionDate = this.paymentTermForm.get('transaction_date').value;

        if (transactionDate) {
            return DateTimeHelper.parseMoment(current).isSameOrBefore(DateTimeHelper.parseMoment(transactionDate));
        } else {
            return false;
        }

    }

    validDateRange(): boolean {

        const start = DateTimeHelper.parseMoment(this.fc.start_date.value);
        const end = DateTimeHelper.parseMoment(this.fc.end_date.value);

        if (start.isAfter(end)) {
            this._notification.displaySnackBar('Please select valid date range', NotifyType.ERROR);
            return false;
        } else {
            return true;
        }

    }

    onSubmit(): void {

        if (this.paymentTermForm.invalid || !this.validDateRange()) {
            return;
        }
        
        const sendObj = {
            name: this.fc.name.value,
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            transaction_generation_date: DateTimeHelper.getUtcDate(this.fc.transaction_date.value),
            payment_generation_date: DateTimeHelper.getUtcDate(this.fc.payment_date.value)
        };
        
        this._logger.debug('[form results]', sendObj);

        this.buttonLoading = true;

        if (this.editMode) {

            this._paymentTermsService.updateTerm({...sendObj, ...{id: this.editData.id}})
                .pipe(
                    takeUntil(this.unsubscribeAll),
                    finalize(() => {
                        this.buttonLoading = false;
                    })
                )
                .subscribe((response) => {

                    setTimeout(() => this.matDialogRef.close(response), 250);

                });


        } else {

            this._paymentTermsService.createTerm(sendObj)
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


}

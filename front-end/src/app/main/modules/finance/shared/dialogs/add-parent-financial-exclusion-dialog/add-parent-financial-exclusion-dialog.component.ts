import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { helpMotion } from 'ng-zorro-antd';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { FinanceAccountsService } from '../../../finance-accounts/services/finance-accounts.service';
import { FinanceService } from '../../services/finance.service';

@Component({
    selector: 'app-add-parent-financial-exclusion-dialog',
    templateUrl: './add-parent-financial-exclusion-dialog.component.html',
    styleUrls: ['./add-parent-financial-exclusion-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class AddParentFinancialExclusionDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    exclusionForm: FormGroup;
    buttonLoading: boolean;

    userId: string | null;

    constructor(
        public matDialogRef: MatDialogRef<AddParentFinancialExclusionDialogComponent>,
        private _formBuilder: FormBuilder,
        private _financeAccountService: FinanceAccountsService,
        private _notification: NotificationService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.userId = this._data.user_id;

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

        this.exclusionForm = this._formBuilder.group({
            start_date: new FormControl(null, [Validators.required]),
            end_date: new FormControl(null, [Validators.required]),
            config: this._formBuilder.group({
                booking_fee: new FormControl(true),
                parent_payment: new FormControl(true),
                ccs_payment: new FormControl(true),
            }, { validators: this.atLeastOneValidator })
        });

    }

    get fc(): any {
        return this.exclusionForm.controls;
    }

    public atLeastOneValidator: ValidatorFn = (control: FormGroup): ValidationErrors | null => {

        const controls = control.controls;

        if (controls) {

            const theOne = Object.keys(controls).findIndex(key => controls[key].value !== false);

            if (theOne === -1) {

                return {
                    atLeastOneRequired: true
                }

            }

        }

        return null;
    
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

    /**
     * on submit
     */
    onSubmit(): void {

        if (this.exclusionForm.invalid || !this.validDateRange()) {
            return;
        }

        const sendObj = {
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            booking_fee: this.fc.config.controls.booking_fee.value,
            parent_payment: this.fc.config.controls.parent_payment.value,
            ccs_payment: this.fc.config.controls.ccs_payment.value,
            user_id: this.userId
        };

        this.buttonLoading = true;

        this._financeAccountService.addParentFinanceExclusion(sendObj)
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

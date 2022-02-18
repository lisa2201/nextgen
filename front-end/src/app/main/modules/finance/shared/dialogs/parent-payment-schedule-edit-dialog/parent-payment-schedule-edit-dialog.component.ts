import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { helpMotion } from 'ng-zorro-antd';
import { Subject } from 'rxjs';
import { FinancePaymentPlan } from '../../../finance-accounts/finance-payment-plan.model';
import * as _ from 'lodash';
import { FinanceService } from '../../services/finance.service';
import { FinanceAccountsService } from '../../../finance-accounts/services/finance-accounts.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';

@Component({
    selector: 'app-parent-payment-schedule-edit-dialog',
    templateUrl: './parent-payment-schedule-edit-dialog.component.html',
    styleUrls: ['./parent-payment-schedule-edit-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class ParentPaymentScheduleEditDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    scheduleEditForm: FormGroup;
    buttonLoading: boolean;
    schedule: FinancePaymentPlan;

    constructor(
        public matDialogRef: MatDialogRef<ParentPaymentScheduleEditDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _financeAccountService: FinanceAccountsService,
        private _logger: NGXLogger
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;
        this.schedule = this._data.schedule;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('[edit data]', this.schedule);

        this.createForm();

        this.patchData();

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

        this.scheduleEditForm = this._formBuilder.group({
            amount_limit: new FormControl(null),
            fixed_amount: new FormControl(null),
        });

    }

    patchData(): void {

        this.scheduleEditForm.patchValue({
            amount_limit: this.schedule.amountLimit ? this.schedule.amountLimit : null,
            fixed_amount: this.schedule.fixedAmount ? this.schedule.fixedAmount : null
        });

    }

    get fc(): any {
        return this.scheduleEditForm.controls;
    }

    /**
     * on submit
     */
    onSubmit(): void {

        if (this.scheduleEditForm.invalid) {
            return;
        }

        const sendObj = {
            id: this.schedule.id,
            amount_limit: this.fc.amount_limit.value,
            fixed_amount: this.fc.fixed_amount.value
        };

        this._logger.debug('[sendObj]', sendObj);

        this.buttonLoading = true;

        this._financeAccountService.editPaymentPlan(sendObj)
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

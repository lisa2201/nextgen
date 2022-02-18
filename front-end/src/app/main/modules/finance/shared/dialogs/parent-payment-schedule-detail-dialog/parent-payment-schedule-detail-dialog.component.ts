import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { helpMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { FinancePaymentPlan } from '../../../finance-accounts/finance-payment-plan.model';
import { FinanceService } from '../../services/finance.service';
import * as _ from 'lodash';

@Component({
    selector: 'app-parent-payment-schedule-detail-dialog',
    templateUrl: './parent-payment-schedule-detail-dialog.component.html',
    styleUrls: ['./parent-payment-schedule-detail-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class ParentPaymentScheduleDetailDialogComponent implements OnInit, OnDestroy {

    schedule: FinancePaymentPlan;
    billingTermDescriptionMap: any;

    constructor(
        public matDialogRef: MatDialogRef<ParentPaymentScheduleDetailDialogComponent>,
        private _logger: NGXLogger,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _financeService: FinanceService
    ) {

        this.schedule = this._data.schedule;
        this.billingTermDescriptionMap = this._financeService.getBillingTermDescriptionMap();

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('[plan_details]', this.schedule);
    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    getEditDate(schedule: FinancePaymentPlan): string {

        if (schedule.editHistory && !_.isEmpty(schedule.editHistory)) {

            const date: any = _.last(schedule.editHistory);
            return date?.edit_date || '';
            
        } else {
            return '';
        }

    }

}

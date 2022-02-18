import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { FinanceAccountPayment } from '../../../finance-account-payments/finance-account-payment.model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { FinanceService } from '../../services/finance.service';

@Component({
    selector: 'app-financial-payment-details-dialog',
    templateUrl: './financial-payment-details-dialog.component.html',
    styleUrls: ['./financial-payment-details-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class FinancialPaymentDetailsDialogComponent implements OnInit, OnDestroy {


    paymentDetail: FinanceAccountPayment;

    constructor(
        public matDialogRef: MatDialogRef<FinancialPaymentDetailsDialogComponent>,
        private _logger: NGXLogger,
        private _financeService: FinanceService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this.paymentDetail = this._data.payment_detail;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('[payment_details]', this.paymentDetail);
    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    getPaymentMethod(detail: FinanceAccountPayment): string {

        return this._financeService.getManualPaymentMapDesc(detail, true);

    }

}

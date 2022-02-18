import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { Payment } from '../../financial-ccs-payments.model';

@Component({
    selector: 'app-ccs-payment-detail-dialog',
    templateUrl: './ccs-payment-detail-dialog.component.html',
    styleUrls: ['./ccs-payment-detail-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class CcsPaymentDetailDialogComponent implements OnInit, OnDestroy {

    paymentDetail: Payment;

    constructor(
        public matDialogRef: MatDialogRef<CcsPaymentDetailDialogComponent>,
        private _logger: NGXLogger,
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

}

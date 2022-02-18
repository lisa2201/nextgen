import { Component, OnInit, OnDestroy, Inject, ViewEncapsulation } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { Payment } from '../../is-case-claim.model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';

@Component({
    selector: 'app-is-claim-payment-detail-dialog',
    templateUrl: './is-claim-payment-detail-dialog.component.html',
    styleUrls: ['./is-claim-payment-detail-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class IsClaimPaymentDetailDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    payment: Payment;

    constructor(
        public matDialogRef: MatDialogRef<IsClaimPaymentDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _logger: NGXLogger
    ) {

        this.unsubscribeAll = new Subject();
        this.payment = this._data.payment ? this._data.payment : null;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('[Payment Detail]', this.payment);

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

 
}

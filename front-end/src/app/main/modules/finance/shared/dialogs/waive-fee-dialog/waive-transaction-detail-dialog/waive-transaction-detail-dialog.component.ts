import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { helpMotion, fadeMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { FinanceService } from '../../../services/finance.service';
import * as _ from 'lodash';

@Component({
    selector: 'app-waive-transaction-detail-dialog',
    templateUrl: './waive-transaction-detail-dialog.component.html',
    styleUrls: ['./waive-transaction-detail-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class WaiveTransactionDetailDialogComponent implements OnInit, OnDestroy {

    child: any;
    transactionTypeMap: any;

    constructor(
        public matDialogRef: MatDialogRef<WaiveTransactionDetailDialogComponent>,
        private _logger: NGXLogger,
        private _financeService: FinanceService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this.child = this._data.child;
        this.transactionTypeMap = this._financeService.getTransactionTypeMap();

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('[child]', this.child);
    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    getTransactionType(transaction: any): string {

        if (_.has(this.transactionTypeMap, transaction.transaction_type)) {
            return this.transactionTypeMap[transaction.transaction_type];
        } else {
            return '';
        }

    }
}

import { Injectable } from '@angular/core';
import { FinancialAdjustmentsService } from './financial-adjustments.service';
import { Observable, forkJoin } from 'rxjs';
import { FinanceService } from '../../shared/services/finance.service';

@Injectable()
export class FinancialAdjustmentsListResolverService {

    constructor(
        private _financialAdjustmentsService: FinancialAdjustmentsService,
        private _financeService: FinanceService
    ) { }

    resolve(): Observable<any> | Promise<any> | any {

        return new Promise((resolve, reject) => {

            forkJoin([
                this._financialAdjustmentsService.listFinancialAdjustments(),
                this._financeService.getAdjustmentListItems()
            ])
            .subscribe(
                ([list, items]) => {

                    this._financialAdjustmentsService.setEvents();
                    this._financialAdjustmentsService.adjustmentItemChanged.next(items);
                    resolve();

                },
                reject
            );

        });

    }

}

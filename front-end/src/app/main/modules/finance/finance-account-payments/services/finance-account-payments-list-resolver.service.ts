import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FinanceService } from '../../shared/services/finance.service';
import { FinanceAccountPaymentsService } from './finance-account-payments.service';

@Injectable()
export class FinanceAccountPaymentsListResolverService implements Resolve<any> {

    constructor(private _financeAccountPaymentsService: FinanceAccountPaymentsService, private _financeService: FinanceService) { }

    resolve(): Promise<any> {

        return new Promise((resolve, reject) => {

            forkJoin([
                this._financeAccountPaymentsService.listFinanceAccountPayments(),
                this._financeService.getSelectParentList()
            ])
            .subscribe(
                ([payments, parents]) => {
                    this._financeAccountPaymentsService.setEvents();
                    this._financeAccountPaymentsService.onFilterParentChanged.next(parents);
                    resolve(null);
                },
                (error) => {
                    reject(error);
                }
            );

        }); 

    }

}

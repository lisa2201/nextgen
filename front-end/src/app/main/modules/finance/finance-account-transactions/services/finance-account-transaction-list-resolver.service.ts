import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FinanceService } from '../../shared/services/finance.service';
import { FinanceAccountTransactionService } from './finance-account-transaction.service';

@Injectable()
export class FinanceAccountTransactionListResolverService implements Resolve<any> {

    constructor(private _financeAccountTransactionService: FinanceAccountTransactionService, private _financeService: FinanceService) { }

    resolve(): Promise<any> {

        return new Promise((resolve, reject) => {

            forkJoin([
                this._financeAccountTransactionService.listFinanceAccounTransactions(),
                this._financeService.getFinancialAdjustmentChildrenList(null, null),
                this._financeService.getSelectParentList()
            ])
            .subscribe(
                ([transactions, children, parents]) => {
                    this._financeAccountTransactionService.setEvents();
                    this._financeAccountTransactionService.onFilterChildrenChanged.next(children);
                    this._financeAccountTransactionService.onFilterParentChanged.next(parents);
                    resolve(null);
                },
                (error) => {
                    reject(error);
                }
            );

        });

    }

}

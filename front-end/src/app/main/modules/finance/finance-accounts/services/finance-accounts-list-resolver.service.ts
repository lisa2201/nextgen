import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { FinanceAccountsService } from './finance-accounts.service';

@Injectable()
export class FinanceAccountsListResolverService implements Resolve<void> {

    constructor(private _financeAccountsService: FinanceAccountsService) { }

    resolve(): Promise<any> {

        return new Promise((resolve, reject) => {

            this._financeAccountsService.listFinanceAccounts()
                .then(() => {
                    this._financeAccountsService.setEvents();
                    resolve(null);
                })
                .catch(reject);

        });
    }
}

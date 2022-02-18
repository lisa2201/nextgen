import { Injectable } from '@angular/core';
import { Resolve, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { FinanceAccountsService } from './finance-accounts.service';

@Injectable()
export class FinancePaymentSettingsResolverService implements Resolve<any> {

    constructor(private _financeAccountsService: FinanceAccountsService) { }

    resolve(route: ActivatedRouteSnapshot): Promise<any> {

        const id = route.paramMap.get('id');

        return Promise.all([
            this._financeAccountsService.listPaymentPlans(id), 
            this._financeAccountsService.listParentFinanceExlusions(id)
        ]);

    }
}

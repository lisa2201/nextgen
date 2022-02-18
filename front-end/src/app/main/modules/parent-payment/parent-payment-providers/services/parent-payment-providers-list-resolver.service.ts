import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { ParentPaymentProvidersService } from './parent-payment-providers.service';

@Injectable()
export class ParentPaymentProvidersListResolverService implements Resolve<any> {

    constructor(private _parentPaymentProvidersService: ParentPaymentProvidersService) { }

    resolve(): Promise<any> {

        return new Promise((resolve, reject) => {

            this._parentPaymentProvidersService.listParentPaymentAccounts()
                .then(() => {
                    this._parentPaymentProvidersService.setEvents();
                    resolve(null);
                })
                .catch(reject);

        });

    }
    
}

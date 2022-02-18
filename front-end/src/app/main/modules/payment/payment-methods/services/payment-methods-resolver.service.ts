import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { PaymentMethodsService } from './payment-methods.service';

@Injectable()
export class PaymentMethodsResolverService implements Resolve<any> {

    constructor(
        private _paymentMethodsService: PaymentMethodsService
    ) {}

    resolve(): Observable<any> | Promise<any> {

        return this._paymentMethodsService.listPaymentMethods();

    }

}

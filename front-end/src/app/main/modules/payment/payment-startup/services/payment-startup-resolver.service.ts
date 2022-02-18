import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

import { Observable, forkJoin } from 'rxjs';

import { CommonService } from 'app/shared/service/common.service';
import { PaymentMethodsService } from '../../payment-methods/services/payment-methods.service';

@Injectable()
export class PaymentStartupResolverService implements Resolve<Observable<any>> {

    constructor(
        private _commonService: CommonService,
        private _paymentMethodsService: PaymentMethodsService
    ) {}

    resolve(): Observable<any> {

        return forkJoin([
            this._commonService.getCountries(),
            this._paymentMethodsService.getEzidebitId(),
            this._paymentMethodsService.getOrg()
        ]);    

    }

}

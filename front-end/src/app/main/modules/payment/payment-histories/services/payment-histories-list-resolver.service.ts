import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { PaymentHistoriesService } from './payment-histories.service';


@Injectable()
export class PaymentHistoriesListResolverService implements Resolve<any> {

    constructor(
        private _paymentHistoriesService: PaymentHistoriesService
    ) {}
    
    resolve(): Observable<any> | Promise<any> | any {
        
        return new Promise((resolve, reject) => {

            this._paymentHistoriesService.listPaymentHistories()
                .then(() => {

                    this._paymentHistoriesService.setEvents();

                    resolve();

                })
                .catch(reject);

        });

    }

}

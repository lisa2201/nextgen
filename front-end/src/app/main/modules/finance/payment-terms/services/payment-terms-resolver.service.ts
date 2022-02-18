import { Injectable } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PaymentTermsService } from './payment-terms.service';

@Injectable()
export class PaymentTermsResolverService {

    constructor(private _paymentTermsService: PaymentTermsService) { }

    resolve(): Promise<any> {

        return new Promise((resolve, reject) => {

            forkJoin([
                this._paymentTermsService.listPaymentTerms()
            ])
            .subscribe(
                ([payments]) => {
                    this._paymentTermsService.setEvents();
                    resolve(null);
                },
                (error) => {
                    reject(error);
                }
            );

        }); 

    }
}

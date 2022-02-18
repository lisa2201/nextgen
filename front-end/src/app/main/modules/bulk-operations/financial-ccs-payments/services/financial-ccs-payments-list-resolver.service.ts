import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { FinancialCcsPaymentsService } from './financial-ccs-payments.service';
import * as moment from 'moment';

@Injectable()
export class FinancialCcsPaymentsListResolver implements Resolve<any> {

    constructor(private _financialCcsPaymentsService: FinancialCcsPaymentsService) { }

    resolve(): Promise<any> {

        return new Promise((resolve, reject) => {

            this._financialCcsPaymentsService.listCcsPayments()
                .then(() => {
                    resolve();
                })
                .catch(reject);

        });
        
    }

}

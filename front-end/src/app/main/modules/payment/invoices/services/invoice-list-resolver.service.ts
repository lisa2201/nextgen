import { Resolve } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { InvoicesService } from './invoices.service';

@Injectable()
export class InvoiceListResolver implements Resolve<any> {

    constructor(
        private _invoicesService: InvoicesService
    ) { }

    resolve(): Observable<any> | Promise<any> | any {

        return new Promise((resolve, reject) => {

            this._invoicesService.listInvoices()
                .then(() => {

                    this._invoicesService.setEvents();

                    resolve();
                    
                })
                .catch(reject);

        });

    }

}

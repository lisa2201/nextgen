import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { InvoicesService } from './invoices.service';

@Injectable()
export class InvoiceResolver implements Resolve<any> {

    constructor(
        private _invoicesService: InvoicesService
    ) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {
        
        return this._invoicesService.getInvoice(route.paramMap.get('id'));

    }

}

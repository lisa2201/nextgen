import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { ParentPaymentMethodsService } from './parent-payment-methods.service';

@Injectable()
export class ParentPaymentMethodsListResolverService implements Resolve<any> {

    constructor(
        private _parentPaymentMethodsService: ParentPaymentMethodsService
    ) { }

    resolve(route: ActivatedRouteSnapshot): Promise<any> {
        return this._parentPaymentMethodsService.listPaymentMethods(route.queryParamMap.get('parent'));
    }

}

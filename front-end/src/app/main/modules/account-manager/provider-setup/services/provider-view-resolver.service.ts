import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { ProviderSetupService } from './provider-setup.service';
import { Observable } from 'rxjs';

@Injectable()
export class ProviderViewResolverService implements Resolve<Observable<any>> {

    constructor(
        private _providerService: ProviderSetupService
    ) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {

        return this._providerService.getprovider(route.paramMap.get('id'));

    }

}

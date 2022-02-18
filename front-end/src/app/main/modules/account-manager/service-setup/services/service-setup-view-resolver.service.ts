import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServiceSetupService } from './service-setup.service';

@Injectable({providedIn: 'root'})
export class ServiceSetupViewResolverService implements Resolve<Observable<any>> {

    constructor(
        private _serviceSetupService: ServiceSetupService
    ) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {

        return this._serviceSetupService.getService(route.paramMap.get('id'));

    }

}

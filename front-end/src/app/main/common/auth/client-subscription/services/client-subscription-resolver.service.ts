import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of, forkJoin } from 'rxjs';
import { Injectable } from '@angular/core';
import { CommonService } from 'app/shared/service/common.service';
import { ClientSubscriptionService } from './client-subscription.service';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { shareReplay } from 'rxjs/operators';

@Injectable({providedIn: 'root'})
export class ClientSubscriptionResolverService implements Resolve<Observable<any>> {

    /**
     * Constructor
     * @param _commonService 
     * @param _clientSubscriptionService 
     * @param _router 
     */
    constructor(
        private _commonService: CommonService,
        private _clientSubscriptionService: ClientSubscriptionService,
        private _router: Router
    ) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {

        if (
            route.queryParamMap.has(AppConst.queryParamKeys.MARKET_PLACE.emailVerifyToken) && 
            !_.isEmpty(route.queryParamMap.get(AppConst.queryParamKeys.MARKET_PLACE.emailVerifyToken))
        ) {

            return of(null);

        } else if (
            route.queryParamMap.has(AppConst.queryParamKeys.MARKET_PLACE.productId) && 
            !_.isEmpty(route.queryParamMap.get(AppConst.queryParamKeys.MARKET_PLACE.productId))
        ) {

            return forkJoin([
                this._commonService.getCountries(),
                this._clientSubscriptionService.getTimezones()
            ])
            .pipe(
                shareReplay()
            );

        } else {
            // return of(null);
            this._router.navigate([AppConst.appStart.ERROR.NOT_FOUND.URL]);
        }

    }

}

import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { AppConst } from '../../../../../shared/AppConst';
import * as _ from 'lodash';

import { shareReplay } from 'rxjs/operators';
import { CommonService } from 'app/shared/service/common.service';
import { MarketPlaceService } from './market-place.service';

@Injectable({
    providedIn: 'root'
})
export class CustomPlanResolverService implements Resolve<Promise<any>> {

    public addonId;
    routeParams: any;

    /**
     * Constructor
     * @param {CommonService} _commonService 
     * @param {Router} _router 
     * @param {MarketPlaceService} _marketplaceService 
     */
    constructor(
        private _commonService: CommonService,
        private _router: Router,
        private _marketplaceService: MarketPlaceService
    ) { }


    /**
     * 
     * @param {ActivatedRouteSnapshot} route 
     * @param {RouterStateSnapshot} state 
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {

        // this.addonId = this._route.snapshot.queryParams['product'];
        // this.routeParams = route.params;
        const id: string = route.queryParams['product'];

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
                this._marketplaceService.getTimezones(),
                this._marketplaceService.getAddonInfo(id),
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

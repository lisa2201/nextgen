import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { AppConst } from '../../../../../../shared/AppConst';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})

export class QuotationVerifyResolverService implements Resolve<Promise<any>>{

  /**
    * Constructor
    * @param {Router} _router 
    */
  constructor(
    private _router: Router,
  ) { }


  /**
     * 
     * @param {ActivatedRouteSnapshot} route 
     * @param {RouterStateSnapshot} state 
     */
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {


    if (
      route.queryParamMap.has(AppConst.queryParamKeys.MARKET_PLACE.quotationVerifyToken) &&
      !_.isEmpty(route.queryParamMap.get(AppConst.queryParamKeys.MARKET_PLACE.quotationVerifyToken))
    ) {

      return of(null);

    } else {

      this._router.navigate([AppConst.appStart.ERROR.NOT_FOUND.URL]);
    }

  }

}

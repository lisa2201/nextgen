import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import * as _ from 'lodash';
import { Addon } from '../addon.model';
import { MarketPlaceService } from './market-place.service';


@Injectable({
    providedIn: 'root'
})
export class MarketPlaceResolverService implements Resolve<any> {

    resolveData: BehaviorSubject<{ addons: Addon[] }>;

    /**
     * Constructor
     * @param {MarketPlaceService} _marketplaceService 
     */
    constructor(
        private _marketplaceService: MarketPlaceService
    ) {

    }

    /**
     * Resolve
     */
    resolve(): Observable<any> {
        return this._marketplaceService.getAddons();
    }

}

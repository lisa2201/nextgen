import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, shareReplay, take } from 'rxjs/operators';
import { AppConst } from '../../../../../shared/AppConst';
import { __param } from 'tslib';

import * as _ from 'lodash';
import { Addon } from '../addon.model';
import { Timezone } from 'app/shared/model/common.interface';

@Injectable({
    providedIn: 'root'
})
export class MarketPlaceService {

    resolveData: BehaviorSubject<{ addons: Addon[] }>;

    constructor(private _http: HttpClient) {
        this.resolveData = new BehaviorSubject({ addons: [] });
    }


    /**
     * Addon List
     */
    getAddons(): Observable<any> {
        return this
            ._http.get
            <any>
            (`${AppConst.apiBaseUrl}/addons`)
            .pipe(
                map((response) => response.data)
            );
    }


    /**
     * addon Info
     * @param {string} id 
     */
    getAddonInfo(id: string): Observable<any> {

        const params = new HttpParams().set('id', id);

        return this
            ._http.get
            <any>
            (`${AppConst.apiBaseUrl}/addonInfo`, { params });

    }



    /**
     * Get TimeZones
     */
    getTimezones(): Promise<Timezone[]> {

        return new Promise((resolve, reject) => {
            this._http
                .get<any>('assets/data/timezone/timezone_country.json')
                .pipe(
                    map(response => response.zones),
                    shareReplay()
                )
                .subscribe(
                    (response: Timezone[]) => resolve(response),
                    reject
                );
        });

    }


    /**
     * Get States
     * @param {string} country 
     */
    getCityStates(country: string): Promise<any> {

        return new Promise((resolve, reject) => {

            const params = new HttpParams().set('country', country);

            this._http
                .get<any>(`${AppConst.apiBaseUrl}/country-states`, { params })
                .pipe(
                    map((response) => response.data.states),
                    shareReplay()
                )
                .subscribe(
                    (response) => resolve(response),
                    reject
                );

        });

    }



    /**
     * Register Custom PLan
     * @param {any} postData 
     */
    register_cust_plan(postData: any): Observable<any> {
        return this._http.post<any>(`${AppConst.apiBaseUrl}/create_cust_plan`, postData)
            .pipe(
                map(response => response.data)

            );

    }



    /**
     * Verify Email
     * @param {any} postData 
     */
    verifyEmail(postData: any): Observable<any> {
        return this._http.post<any>(`${AppConst.apiBaseUrl}/cust_plan_verify_email`, postData)
            .pipe(
                map(response => response.data)
            );
    }



    /**
     * Resend Email
     * @param {any} postData 
     */
    resend_email(postData: any): Observable<any> {

        return this._http.post<any>(`${AppConst.apiBaseUrl}/resend_cust_plan_verify_email`, postData)
            .pipe(
                // map(response => response.data)
                take(1),
                shareReplay()
            );

    }


    /**
     * Resend Quotation
     * @param {any} postData 
     */
    resendQuotation(postData: any): Observable<any> {

        return this._http.post<any>(`${AppConst.apiBaseUrl}/resend-quotation`, postData)
            .pipe(
                // map(response => response.data)
                take(1),
                shareReplay()
            );

    }

}

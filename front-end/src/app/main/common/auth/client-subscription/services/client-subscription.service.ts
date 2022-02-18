import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay, take } from 'rxjs/operators';

import * as _ from 'lodash';

import { Timezone, CityState } from 'app/shared/model/common.interface';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';

@Injectable({
    providedIn: 'root'
})
export class ClientSubscriptionService {

    /**
     * Constructor
     * 
     * @param {CommonService} _commonService
     * @param {Router} _router
     */
    constructor(
        private _httpClient: HttpClient
    ) { }

    /**
     * Get timezones
     * @returns {Observable}
     */
    getTimezones(): Observable<Timezone[]> {

        return this._httpClient
            .get<any>('assets/data/timezone/timezone_country.json')
            .pipe(
                take(1),
                map(response => response.zones),
                shareReplay()
            );

    }

    /**
     * Get city states of country
     * @param {string} country
     * @returns {Promise}
     */
    getCityStates(country: string): Observable<CityState[]> {

        const params = new HttpParams().set('country', country);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/country-states`, { params })
            .pipe(
                take(1),
                map((response) => response.data.states),
                shareReplay()
            );

    }

    /**
     * Subscribe client
     * @param postData 
     * @returns {Observable}
     */
    subscribeClient(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/auth_register`, postData)
        .pipe(
            map(response => response.data)
        );

    }

    /**
     * Verify email 
     * @param postData 
     * @returns {Observable}
     */
    verifyEmail(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/auth_verify_email`, postData)
        .pipe(
            map(response => response.data)
        );
        
    }

    resendEmailVerification(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/resend_auth_verify_email`, postData)
            .pipe(
                take(1),
                shareReplay()
            );

    }

}

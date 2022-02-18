import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { User } from 'app/main/modules/user/user.model';


@Injectable({
    providedIn: 'root'
})
export class ResetPasswordService implements Resolve<any>
{
    onTokenVerified: BehaviorSubject<any>;
    queryParams: any;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger

    )
    {
        // Set the defaults
        this.onTokenVerified = new BehaviorSubject([]);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resolver
     *
     * @param {ActivatedRouteSnapshot} route
     * @param {RouterStateSnapshot} state
     * @returns {Observable<any> | Promise<any> | any}
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any
    {
        this.queryParams = route.queryParams;

        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this.verifyToken(!_.isEmpty(this.queryParams) ? this.queryParams : null)
            ])
            .then(([user]: [any]) => 
            {
                resolve();
            })
            .catch(error => 
            {
                reject(error);
            });
        });
    }

    /**
     * Get branch list
     *
     * @returns {Promise<any>}
     */
    verifyToken(qParams: any): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            const params = new HttpParams()
                .set('token', qParams ? qParams.token : null)
                .set('ref', qParams ? qParams.ref : null);

            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/verify_reset_token`, { params })
                .pipe(
                    map(response =>
                    {
                        return {
                            item: (!response.data || (response.data && _.keys(response.data).length < 1)) ? null :  new User(response.data),
                            message: response.message,
                            hint: response.hint
                        }
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => 
                    {
                        this.onTokenVerified.next(response);
                        
                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * reset passport
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    resetPassword(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/reset-password`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }
}

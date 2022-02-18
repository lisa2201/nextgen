import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { Branch } from 'app/main/modules/branch/branch.model';
import { ProviderSetup } from '../../provider-setup/models/provider-setup.model';
import { User } from 'app/main/modules/user/user.model';
import { ServicePersonnel } from '../model/ServicePersonnel';
import { ProviderPersonnel } from '../model/providerPersonnel';

@Injectable()
export class ProviderPersonalService implements Resolve<any>
{
    onProviderPersonnelChanged: BehaviorSubject<any>;
    
    uploadDirectory: any;
    providerPersonnel: ProviderPersonnel[];

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
        this.onProviderPersonnelChanged = new BehaviorSubject([]);
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
        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this.getPersonalProviders()
            ])
            .then(([service]: [any]) => 
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
    getPersonalProviders(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-provider-personnel-list`)
                .pipe(
                    map(response => response.data),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => 
                    {
                        this.providerPersonnel = response.map((i, idx) => new ProviderPersonnel(i, idx));
                        this.onProviderPersonnelChanged.next([...this.providerPersonnel]);
                        resolve();
                    },
                    reject
                );
        });
    }

    storePersonnelProvider(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-personnel-provider`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new ProviderPersonnel(response.data);
                        item.isNew = true;

                        this.providerPersonnel = this.providerPersonnel.concat(item).map((v, i) =>
                        {
                            v.index = i;
                            return v;
                        });

                        setTimeout(() => this.onProviderPersonnelChanged.next([...this.providerPersonnel]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    getProviderPersonnel(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-provider-personnel-info`, { params })
            .pipe(
                map(response => {

                    return new ProviderPersonnel(response.data);
                }),
                shareReplay()
            );
    }

    
}

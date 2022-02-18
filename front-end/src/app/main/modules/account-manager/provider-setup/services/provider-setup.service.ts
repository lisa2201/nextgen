import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';
import { shareReplay, map, take, tap } from 'rxjs/operators';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import * as _ from 'lodash';
import { Permission } from 'app/main/modules/permission/permission.model';
import { ProviderSetup } from '../models/provider-setup.model';

@Injectable()
export class ProviderSetupService {




    onTableLoaderChanged: Subject<any>;

    constructor(
        private _httpClient: HttpClient
    ) 
    {
        
    this.onTableLoaderChanged = new Subject();
    }

    providers: any;
    onProviderChanged = new BehaviorSubject<any>([]);

    getProviders(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-list-providersetup`)
            .pipe(
                map(response => response.data)
            );

    }

    addProviders(data: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-provider`, data)
            .pipe(
                map(response => response.message)
            );

    }






    getprovider(id: string): Observable<any> {
        this.onTableLoaderChanged.next(true);
        const params = new HttpParams().set('index', id);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-provider`, { params: params })
            .pipe(
                map((response: any) => {
                    this.onTableLoaderChanged.next(false);

                    return {
                        providerData: response.data,
                        // providerData: response.data = new ProviderSetup(),
                        apiData: response.data.is_synced !== '0' ? response.ApiData : null,
                        syncerror: response.syncerror,
                    };
                }),
            );

    }

    updateaddress(data: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/edit-provider-address`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }

    
    updateBusiness(data: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/edit-provider-name`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }

    updatefinancial(data: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/edit-provider-financial`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }

    updatecontact(data: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/edit-provider-contact`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }
    getDependency(): Observable<any> {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/provider-data`, {})
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length < 1) {
                        return {};
                    }
                    else if (response.data.perms.length < 1 || response.data.rlevels.length < 1) {
                        return {};
                    }
                    else {
                        return {
                            perms: response.data.perms.map((i, idx) => new Permission(i, idx)),
                            levels: response.data.rlevels,

                        };
                    }
                }),
                shareReplay()
            );
    }
}



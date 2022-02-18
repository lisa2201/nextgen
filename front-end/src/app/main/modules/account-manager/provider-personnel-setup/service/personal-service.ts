import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject, pipe } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { Branch } from 'app/main/modules/branch/branch.model';
import { ProviderSetup } from '../../provider-setup/models/provider-setup.model';
import { User } from 'app/main/modules/user/user.model';
import { ServicePersonnel } from '../model/ServicePersonnel';

@Injectable()
export class ServicePersonalService implements Resolve<any>
{
    onBranchChanged: BehaviorSubject<any>;
    onservicePersonnelChanged: BehaviorSubject<any>;
    onBranchStatusChanged: Subject<any>;

    private branches: Branch[];
    uploadDirectory: any;
    servicePersonnel: ServicePersonnel[];

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
        this.onBranchChanged = new BehaviorSubject([]);
        this.onservicePersonnelChanged = new BehaviorSubject([]);
        this.onBranchStatusChanged = new Subject();
        this.uploadDirectory = `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/personal-service-data-submit`;
        // this.uploadDirectory = this._httpClient.get(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/personal-service-data-submit`);
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
                this.getPersonalService()
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
    getPersonalService(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-personnel-list`)
                .pipe(
                    map(response => response.data),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => 
                    {
                        this.servicePersonnel = response.map((i, idx) => new ServicePersonnel(i, idx));
                        this.onservicePersonnelChanged.next([...this.servicePersonnel]);
                        resolve();
                    },
                    reject
                );
        });
    }


    getUserData(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-user-list-personnel`)
                .pipe(
                    map((response: any) => {
                        return response.data.map((i, idx) => new User(i));
                        // return response.data.map((i, idx) => new User(i);
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
            
        });
    }

    getBranches(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-branch-list`, {})
                .pipe(
                    map((response: any) => {
                        return response.data.map((i, idx) => new Branch(i));
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
            
        });
    }

    storePersonnel(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-personnel-service`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new ServicePersonnel(response.data);
                        item.isNew = true;

                        this.servicePersonnel = this.servicePersonnel.concat(item).map((v, i) =>
                        {
                            v.index = i;
                            return v;
                        });

                        setTimeout(() => this.onservicePersonnelChanged.next([...this.servicePersonnel]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    // tslint:disable-next-line: typedef
    public upload(formData) {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/personal-service-data-submit`, formData, {  
          reportProgress: true,  
          observe: 'events'  
        });  
    }

    getServicePersonnel(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-service-personnel-info`, { params })
            .pipe(
                map(response => new ServicePersonnel(response.data)),
                shareReplay()
            );
    }

    postFile(fileToUpload: string): Observable<boolean> {
        const formData: FormData = new FormData();
        
        // formData.append('fileList', fileToUpload, 'filename');
        // console.log('this last form data in service', formData);
        // console.log('this last form', fileToUpload);

        const input = {
            'file' : fileToUpload
        };
        const httpOptions = {
            // headers: new HttpHeaders({
            //     'Authorization' : 'Bearer ' +  Cookie.get('mmraccesstokenhope'),
            //     'Content-type': 'application/json; charset=utf-8; boundary=' + Math.random().toString().substr(2) + ';',
            // })
        };
        const headers = new HttpHeaders();
        headers.append('Content-Type', 'multipart/form-data');
        headers.append('Accept', 'application/json');
        
        
        return this._httpClient
        .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/personal-service-data-submit`, input, {headers: headers})
          .pipe(
            map(() => true)
          );
    }

}

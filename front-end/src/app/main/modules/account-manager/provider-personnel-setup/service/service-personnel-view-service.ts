import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, takeUntil, first, shareReplay } from 'rxjs/operators';

import { NGXLogger } from 'ngx-logger';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { ProviderPersonnel } from '../model/providerPersonnel';
import { CommonService } from 'app/shared/service/common.service';
import { BranchService } from 'app/main/modules/branch/services/branch.service';
import { browserRefresh } from 'app/app.component';
import { Branch } from 'app/main/modules/branch/branch.model';
import { ProviderSetup } from '../../provider-setup/models/provider-setup.model';
import { ServicePersonnel } from '../model/ServicePersonnel';
import { ServicePersonalService } from './personal-service';


@Injectable()
export class ServicePersonnelViewService implements Resolve<any>
{
    // onBranchChanged: BehaviorSubject<any>;
    onServicePersonnelUpdateChanged: BehaviorSubject<any>;

    onServicePersonnelChanged: BehaviorSubject<any>;
    
    uploadDirectory: any;
    servicePersonnel: ServicePersonnel;


    routeParams: any;

    /**
     * Constructor
     * 
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {CommonService} _commonService
     * @param {BranchService} _branchService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _commonService: CommonService,
        private _branchService: BranchService,
        private _personalService: ServicePersonalService,
    )
    {
        // Set the defaults
        this.onServicePersonnelChanged = new BehaviorSubject([]);
        this.onServicePersonnelUpdateChanged = new BehaviorSubject([]);
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
        this.routeParams = route.params;

        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this.getServicePersonnel(this.routeParams.id),
                // this._commonService.getTimeZones(),
                // this._commonService.getCountries(),
                // this._branchService.getProviders(),
                // this._branchService.getCCSInfo()

            ])
            .then(([servicePersonnel]: [ServicePersonnel]) => 
            {
                this.onServicePersonnelChanged.next({
                    servicePersonnel: servicePersonnel
                });
                    
                resolve();
            })
            .catch(error => 
            {
                if (browserRefresh) { this._router.navigate(['/account-manager/modules/personnels/service']); }

                reject(error);
            });
        });
    }

    /**
     * Get branch item
     *
     * @returns {Promise<any>}
     */
    getServicePersonnel(id: string): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._personalService
                .getServicePersonnel(id)
                .pipe(first())
                .subscribe(
                    (response: ServicePersonnel) => 
                    {
                        console.log('getServicePersonnel in service function', response);
                        
                        this.servicePersonnel = response;
                        
                        resolve(this.servicePersonnel);
                    },
                    reject
                );
        });
    }

    updateDeclaration(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-service-personnel-declaration`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        console.log(response.data);
                        
                        const item = new ServicePersonnel(response.data);

                        item.isNew = true;
                        this.onServicePersonnelChanged.next({
                    servicePersonnel: item 
                });
                      
                        // setTimeout(() => this.onServicePersonnelUpdateChanged.next(response.data), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }


    addNew(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-service-personnel-new-data`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        console.log(response.data);
                        
                        const item = new ServicePersonnel(response.data);

                        item.isNew = true;
                        this.onServicePersonnelChanged.next({
                    servicePersonnel: item 
                });
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    
    editContact(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-service-personnel-contact`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        console.log(response.data);
                        
                        const item = new ServicePersonnel(response.data);

                        item.isNew = true;
                        this.onServicePersonnelChanged.next({
                    servicePersonnel: item 
                });
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    updatePersonnel(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-personnel-service`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        console.log(response.data);

                        const item = new ServicePersonnel(response.data);

                        item.isNew = true;
                        this.onServicePersonnelChanged.next({
                            servicePersonnel: item
                        });
                        // const item = new ServicePersonnel(response.data);
                        // item.isNew = true;

                        // this.servicePersonnel = this.servicePersonnel.concat(item).map((v, i) =>
                        // {
                        //     v.index = i;
                        //     return v;
                        // });

                        // setTimeout(() => this.onProviderPersonnelChanged.next([...this.providerPersonnel]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }
    


}

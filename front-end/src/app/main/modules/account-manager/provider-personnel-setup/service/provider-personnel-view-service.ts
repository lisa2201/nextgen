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
import { ProviderPersonalService } from './provider-personnel-service';


@Injectable()
export class ProviderPersonnelViewService implements Resolve<any>
{
    // onBranchChanged: BehaviorSubject<any>;
    onBranchUpdateChanged: BehaviorSubject<any>;

    onProviderPersonnelChanged: BehaviorSubject<any>;
    
    uploadDirectory: any;
    providerPersonnel: ProviderPersonnel;


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
        private _personalProvider: ProviderPersonalService,
    )
    {
        // Set the defaults
        this.onProviderPersonnelChanged = new BehaviorSubject([]);
        this.onBranchUpdateChanged = new BehaviorSubject([]);
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
                this.getProviderPersonnel(this.routeParams.id),
                // this._commonService.getTimeZones(),
                // this._commonService.getCountries(),
                // this._branchService.getProviders(),
                // this._branchService.getCCSInfo()

            ])
            .then(([providerPersonnel]: [ProviderPersonnel]) => 
            {
                this.onProviderPersonnelChanged.next({
                    // branch: branch,
                    // timezones: timezones,
                    // countries: countries,
                    // providers: providers,
                    // ccs: ccs
                    providerPersonnel: providerPersonnel
                });
                    
                resolve();
            })
            .catch(error => 
            {
                // if (browserRefresh) { this._router.navigate(['/manage-branches']); }

                reject(error);
            });
        });
    }

    /**
     * Get branch item
     *
     * @returns {Promise<any>}
     */
    getProviderPersonnel(id: string): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._personalProvider
                .getProviderPersonnel(id)
                .pipe(first())
                .subscribe(
                    (response: ProviderPersonnel) => 
                    {
                        console.log('getproviderPersonnel', response);
                        
                        this.providerPersonnel = response;
                        
                        resolve(this.providerPersonnel);
                    },
                    reject
                );
        });
    }

    updateBranch(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-branch`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        console.log(response.data);
                        
                        const item = new Branch(response.data);

                        // const index = this.branch.findIndex((val) => val.id === item.id);
                        
                        item.isNew = true;
                        // item.index = this.branch[index].index;
                        
                        // this.branches[index] = item;
                        // this.onBranchUpdateChanged.next({
                        //     branch: item,
                        //     timezones: timezones,
                        //     countries: countries,
                        //     providers: providers,
                        //     ccs: ccs
                        // });

                        // setTimeout(() => this.onBranchUpdateChanged.next([...response.data]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    
    editContact(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-provider-personnel-contact`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        console.log(response.data);
                        
                        const item = new ProviderPersonnel(response.data);

                        item.isNew = true;
                        this.onProviderPersonnelChanged.next({
                            providerPersonnel: item 
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
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-personnel-provider`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        console.log(response.data);

                        const item = new ProviderPersonnel(response.data);

                        item.isNew = true;
                        this.onProviderPersonnelChanged.next({
                            providerPersonnel: item
                        });
                        
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    addNew(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-provider-personnel-new-data`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        console.log(response.data);
                        
                        const item = new ProviderPersonnel(response.data);

                        item.isNew = true;
                        this.onProviderPersonnelChanged.next({
                            providerPersonnel: item 
                });
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }
    




}

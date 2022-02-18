import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, takeUntil, first, shareReplay } from 'rxjs/operators';

import { NGXLogger } from 'ngx-logger';

import { Branch } from '../branch.model';

import { browserRefresh } from 'app/app.component';

import { CommonService } from 'app/shared/service/common.service';
import { BranchService } from './branch.service';
import { ProviderSetup } from '../../account-manager/provider-setup/models/provider-setup.model';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';


@Injectable()
export class BranchEditService implements Resolve<any>
{
    onBranchChanged: BehaviorSubject<any>;
    onBranchUpdateChanged: BehaviorSubject<any>;

    private branch: Branch;

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
        private _branchService: BranchService
    )
    {
        // Set the defaults
        this.onBranchChanged = new BehaviorSubject([]);
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
                this.getBranch(this.routeParams.id),
                this._commonService.getTimeZones(),
                this._commonService.getCountries(),
                this._branchService.getProviders(),
                this._branchService.getCCSInfo()

            ])
            .then(([branch, timezones, countries, providers, ccs]: [Branch, any, any, ProviderSetup[], any]) => 
            {
                this.onBranchChanged.next({
                    branch: branch,
                    timezones: timezones,
                    countries: countries,
                    providers: providers,
                    ccs: ccs
                });
                    
                resolve();
            })
            .catch(error => 
            {
                if (browserRefresh) { this._router.navigate(['/manage-branches']); }

                reject(error);
            });
        });
    }

    /**
     * Get branch item
     *
     * @returns {Promise<any>}
     */
    getBranch(id: string): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._branchService
                .getBranch(id)
                .pipe(first())
                .subscribe(
                    (response: Branch) => 
                    {
                        this.branch = response;
                        
                        resolve(this.branch);
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
                        const item = new Branch(response.data);

                        item.isNew = true;
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';

import { Branch } from '../branch.model';
import { ProviderSetup } from '../../account-manager/provider-setup/models/provider-setup.model';

@Injectable()
export class BranchService implements Resolve<any>
{
    onBranchChanged: BehaviorSubject<any>;
    onBranchStatusChanged: Subject<any>;

    private branches: Branch[];

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
        this.onBranchStatusChanged = new Subject();
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
                this.getBranches()
            ])
            .then(([branches]: [any]) => 
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
    getBranches(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-branch-list`, {})
                .pipe(
                    map(response => response.data),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => 
                    {
                        this.branches = response.map((i, idx) => new Branch(i, idx));
                        this.onBranchChanged.next([...this.branches]);
                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * Create new branch
     * 
     * @returns {Observable<any>}
     */
    storeBranch(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-branch`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new Branch(response.data);
                        item.isNew = true;

                        this.branches = this.branches.concat(item).map((v, i) =>
                        {
                            v.index = i;
                            return v;
                        });

                        setTimeout(() => this.onBranchChanged.next([...this.branches]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * Get branch item
     * 
     * @returns {Observable<any>}
     */
    getBranch(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-branch-info`, { params })
            .pipe(
                map(response => new Branch(response.data)),
                shareReplay()
            );
    }

    /**
     * Delete a branch
     * 
     * @returns {Observable<any>}
     */
    deleteBranch(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-branch`, { params })
            .pipe(
                map(response => 
                {
                    this.branches = this.branches.filter((i) => i.id !== index).map((v, i) =>
                    {
                        v.index = i;
                        return v;
                    });

                    setTimeout(() => this.onBranchChanged.next([...this.branches]), 500);

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * Update branch status
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateStatus(data: object, index: number): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-branch-status`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new Branch(response.data);
                        
                        setTimeout(() => this.onBranchStatusChanged.next({ status: item.status, position: index }), 200);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * get branch list by user
     *
     * @returns {Observable<any>}
     */
    getBranchesByUser(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-branch-list-by-user`, {})
            .pipe(
                map(response => response.data),
                shareReplay()
            );
    }

    getProviders(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-list-providersetup`)
                .pipe(
                    map((response: any) => response.data.map((i, idx) => new ProviderSetup(i))),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
            
        });
    }

    getCCSInfo(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-org-ccs-info`)
                .pipe(
                    map((response: any) => response.data.hasccs),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
            
        });
    }

}

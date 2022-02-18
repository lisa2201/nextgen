import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';

import { Role } from '../role.model';
import { Permission } from '../../permission/permission.model';


@Injectable()
export class RoleService implements Resolve<any>
{
    onRoleChanged: BehaviorSubject<any>;

    private roles: Role[];

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
    )
    {
        // Set the defaults
        this.onRoleChanged = new BehaviorSubject([]);
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
                this.getRoles()
            ])
            .then(([roles]: [any]) => 
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
     * Get role list
     *
     * @returns {Promise<any>}
     */
    getRoles(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-role-list`, {})
                .pipe(
                    map(response => response.data),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => 
                    {
                        this.roles = response.map((i, idx) => new Role(i, idx));
                        
                        this.onRoleChanged.next([...this.roles]);

                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * Get role dependencies
     * 
     * @returns {Observable<any>}
     */
    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/role-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    else if (response.data.perms.length < 1 || response.data.rlevels.length < 1)
                    {
                        return {};    
                    }
                    else
                    {
                        return {
                            perms: response.data.perms.map((i, idx) => new Permission(i, idx)),
                            levels: response.data.rlevels
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * Create new role
     * 
     * @returns {Observable<any>}
     */
    storeRole(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-role`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const roleData = new Role(response.data);
                        roleData.isNew = true;

                        this.roles = this.roles.concat(roleData).map((v, i) =>
                        {
                            v.index = i;
                            return v;
                        });

                        setTimeout(() => this.onRoleChanged.next([...this.roles]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * Get role item
     * 
     * @returns {Observable<any>}
     */
    getRole(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-role-info`, { params })
            .pipe(
                map(response => new Role(response.data)),
                shareReplay()
            );
    }

    /**
     * Update role item
     * 
     * @returns {Observable<any>}
     */
    updateRole(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-role`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new Role(response.data);
                        
                        const index = this.roles.findIndex((val) => val.id === item.id);

                        item.isNew = true;
                        item.index = this.roles[index].index;

                        this.roles[index] = item;

                        setTimeout(() => this.onRoleChanged.next([...this.roles]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * Delete a role
     * 
     * @returns {Observable<any>}
     */
    deleteRole(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-role`, { params })
            .pipe(
                map(response => 
                {
                    this.roles = this.roles.filter((i) => i.id !== index).map((v, i) =>
                    {
                        v.index = i;
                        return v;
                    });

                    setTimeout(() => this.onRoleChanged.next([...this.roles]), 500);

                    return response.message;
                }),
                shareReplay()
            );
    }

    
}

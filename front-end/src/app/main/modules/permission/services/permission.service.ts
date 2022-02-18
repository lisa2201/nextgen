import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { AppConst } from 'app/shared/AppConst';
import { Permission } from '../permission.model';

@Injectable()
export class PermissionService implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;

    private permissions: Permission[];

    onPermissionsChanged: BehaviorSubject<any>;
    onUpdatesChanged: BehaviorSubject<any>;
    onResourceChanged: BehaviorSubject<any>;

    onTableLoaderChanged: Subject<any>;
    onUpdateSuccess: Subject<any>;
    

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _authService: AuthService,
        private _notificationService: NotificationService
    )
    {
        // Set the defaults
        this.onPermissionsChanged = new BehaviorSubject([]);
        this.onUpdatesChanged = new BehaviorSubject([]);
        this.onResourceChanged = new BehaviorSubject([]);

        this.onTableLoaderChanged = new Subject();
        this.onUpdateSuccess = new Subject();

        this._unsubscribeAll = new Subject();
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
                this.getPermissions(),
            ])
            .then(([permissions]: [any]) => 
            {  
                this.setEvents();

                resolve();
            })
            .catch(errorResponse => 
            {
                reject(errorResponse);
            });
        });
    }

    /**
     * set events after resolve
     */
    setEvents(): void
    {
        this.onUpdateSuccess
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.getPermissions());
    }

    /**
     * Get permission group list
     *
     * @returns {Promise<any>}
     */
    getPermissions(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            // set table loader
            this.onTableLoaderChanged.next(true);

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-group-perms`, {})
                .pipe(
                    map(response => 
                    {
                        return {
                            permissions: response.data.permissions.map((i: any, idx: number) => new Permission(i, idx)),
                            updates: response.data.new,
                            resource: response.data.list
                        }
                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: { permissions: Permission[], updates: any, resource: any }) =>
                    {
                        this.permissions = response.permissions;
                    
                        this.onUpdatesChanged.next(response.updates);
                        
                        this.onResourceChanged.next(response.resource);
                        
                        this.onPermissionsChanged.next( this.permissions);
                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * Get permission dependencies
     *
     * @param {string} type
     * @returns {Observable<any>}
     */
    getDependency(type: string): Observable<any>
    {
        const params = new HttpParams()
            .set('type', type);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/permission-data`, { params })
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        return {
                            perms: response.data.perms.map((i: any, idx: number) => new Permission(i, idx)),
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * Update permission items
     * 
     * @returns {Observable<any>}
     */
    updatePermissionGroups(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-permission-groups`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * Resolve permission issues
     * 
     * @returns {Observable<any>}
     */
    resolveConflicts(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/resolve-permission-issues`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * Get permissions by role type
     * 
     * @returns {Observable<any>}
     */
    getTypePermissions(type: string): Observable<any>
    {
        const params = new HttpParams()
            .set('type', type);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-type-permissions`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Permission(i, idx))),
                shareReplay()
            );
    }

    /**
     * Get user permissions
     * 
     * @returns {Observable<any>}
     */
    userPermissions(id: string): Observable<any>
    {
        const params = new HttpParams()
            .set('index', id);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-user-permissions`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Permission(i, idx))),
                shareReplay()
            );
    }

    /**
     * Update user permissions
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateUserPermissions(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-user-permissions`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * Unsubscribe options
     */
    unsubscribeOptions(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        // reset all variables
        this.permissions = [];
    }

}

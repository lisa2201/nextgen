import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';

import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { Child } from 'app/main/modules/child/child.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { User } from 'app/main/modules/user/user.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { Role } from 'app/main/modules/role/role.model';

@Injectable()
export class ImportStaffService implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;

    onUserChanged: BehaviorSubject<{}>;
    onDependsChanged: BehaviorSubject<any>;
    onRoleChanged: BehaviorSubject<any>;
    roles : Role[];

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
        private _authService: AuthService
    )
    {
        // Set the defaults

        this.onUserChanged = new BehaviorSubject({user: []});
        this.onDependsChanged = new BehaviorSubject([]);
        this.onRoleChanged = new BehaviorSubject([]);

        // this.onSearchTextChanged = new Subject();
        // this.onSortChanged = new Subject();
        // this.onPaginationChanged = new Subject();
        // this.onTableLoaderChanged = new Subject();
        // this.onFilterChanged = new Subject();

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
                this.getDependency().toPromise(),
                this.getRoles()
            ])
            .then(([dependencies, roles]: [any, Role[]]) => 
            {
                this.setEvents(dependencies);

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
    setEvents(dependencies: any = null): void
    {
        if(dependencies)
        {
            this.onDependsChanged.next(dependencies);
        }
    }

    /**
     * get enrolment import dependency
     *
     * @returns {Observable<any>}
     */
    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/import-enrolment-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1 || response.data.orgs.length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        return {
                            subscribers: response.data.orgs.map((i: any, idx: number) => new Organization(i, idx)),
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * Get enrolment list
     *
     * @returns {Observable<any>}
     */

    getRoles(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-role-list-data-migration`, {})
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

    MigrateUserData(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/migrate-staff-data`, data)
            .pipe(
                map(response =>
                {
                    this.onUserChanged.next({
                        user:response.data.map(i => new User(i))
                    });

                    return response.message;
                }),
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

    }

}

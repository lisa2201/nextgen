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
import { FinanceAccount } from 'app/main/modules/finance/finance-accounts/finance-account.model';

@Injectable()
export class ImportParentService implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;

    onParentsChanged: BehaviorSubject<{}>;
    onDependsChanged: BehaviorSubject<any>;
    user:FinanceAccount[];

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


        this.onParentsChanged = new BehaviorSubject({branch: null, org: null, user: []});
        this.onDependsChanged = new BehaviorSubject([]);

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
            ])
            .then(([dependencies]: [any]) => 
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
    update(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/migrate-parent-csv-data`, data)
            .pipe(
                map(response =>
                {
                    this.onParentsChanged.next({
                        org: data['org'],
                        branch: data['branch'],
                        user:response.data.map(i => new User(i))
                    });

                    return response.message;
                }),
                shareReplay()
            );
    }

    getUsers(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            const params = new HttpParams()
            .set('view-parent', '1');


            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-user-report`, { params })
                .pipe(
                    map((response: any) => {
                        this.user = response.data.map((i, idx) => new FinanceAccount(i));
                        return response.data.map((i, idx) => new FinanceAccount(i));
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>  resolve(response),
                    reject
                );
            
        });
    }

    syncUser(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/migrate-parent-csv-data-sync-kinder-connect`, data)
            .pipe(
                map(response =>
                {
                    this.onParentsChanged.next({
                        org: data['org'],
                        branch: data['branch'],
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

    }

}

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
import { Room } from 'app/main/modules/room/models/room.model';
import { User } from '../../user/user.model';

@Injectable()
export class BulkSNSService implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;
    onDependsChanged: BehaviorSubject<any>;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 5;
    defaultPageSizeOptions: number[] = [5, 10, 20];

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
        return new Promise<void>((resolve, reject) =>
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
     * get booking import dependency
     *
     * @returns {Observable<any>}
     */
    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/import-booking-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1 || response.data.orgs.length < 1)
                    {
                        return ;
                    }
                    else
                    {
                        return response.data.orgs.map((i: any, idx: number) => new Organization(i, idx));
                        
                    }
                }),
                shareReplay()
            );
    }

    
    syncChild(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/send-bulk-sns-child`, {params})
            .pipe(
                map(response =>
                {
                        return response.message;
                }),
                shareReplay()
            );
    }

    syncUser(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/send-bulk-sns-user`, {params})
            .pipe(
                map(response =>
                {
                        return response.message;
                }),
                shareReplay()
            );
    }

    getUserByBranch(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-user-by-branch`, {params})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return ;
                    }
                    else
                    {
                        return response.data.map((i: any, idx: number) => new User(i, idx));
                        
                    }
                }),
                shareReplay()
            );
    }

    getChildByBranch(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-by-branch`, {params})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1 )
                    {
                        return ;
                    }
                    else
                    {
                        return response.data.map((i: any, idx: number) => new Child(i, idx));
                        
                    }
                }),
                shareReplay()
            );
    }

    
    runScript(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/run-petty-cash-script`, {data})
            .pipe(
                map(response =>
                {
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

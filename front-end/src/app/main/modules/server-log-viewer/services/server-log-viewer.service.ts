import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';


@Injectable()
export class ServerLogViewerService implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;

    private logs: any;

    onPermissionsChanged: BehaviorSubject<any>;
    onCalenderDateChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;

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
        private _authService: AuthService,
    )
    {
        // Set the defaults
        this.onPermissionsChanged = new BehaviorSubject([]);
        this.onCalenderDateChanged = new Subject();
        this.onTableLoaderChanged = new Subject();

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
        return true;
    }

    /**
     * Get permission group list
     *
     * @returns {Observable<any>}
     */
    getLogs(date: string): Observable<any>
    {
        const params = new HttpParams().set('date', date);

        // set table loader
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-logs`, { params })
            .pipe(
                map(response => response.hasOwnProperty('data') ? response.data : null),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
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
        this.logs = [];
    }

}

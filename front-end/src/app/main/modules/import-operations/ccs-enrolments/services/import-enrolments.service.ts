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

@Injectable()
export class ImportCCSEnrolmentService implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;

    onEnrollmentsChanged: BehaviorSubject<{ list: any, children: Child[], fees: Fee[], parents: User[], branch: string, organization: string, csv: any, missing: Array<string> }>;
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
        this.onEnrollmentsChanged = new BehaviorSubject({ list: [], children: [], fees: [], parents: [], branch: null, organization: null, csv: [], missing: [] });
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
    getEnrollments(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrolment-list`, data)
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
                            children: response.data.children.map((i: any, idx: number) => new Child(i, idx)),
                            parents: response.data.parents.map((i: any, idx: number) => new User(i, idx)),
                            fees: response.data.fees.map((i: any, idx: number) => new Fee(i, idx)),
                            enrollments: response.data.enrollments,
                            missing: response.data.missing
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * migrate enrollments
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    migrateEnrollments(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/migrate-css-enrollments`, data)
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
        // reset BehaviorSubject
        this.onEnrollmentsChanged.next({ list: [], children: [], fees: [], parents: [], branch: null, organization: null, csv: [], missing: []  });

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();
    }

}

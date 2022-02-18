import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { StaffIncident } from '../staff-incident.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Resolve } from '@angular/router';
import { first, takeUntil, map, shareReplay, finalize } from 'rxjs/operators';
import { AppConst } from 'app/shared/AppConst';
import { CommonService } from 'app/shared/service/common.service';
import * as _ from 'lodash';
import { StaffIncidentService } from './staff-incident.service';

@Injectable()
export class StaffIncidentWebviewService implements Resolve<any> {

    onIncidentChanged: BehaviorSubject<any>;

    private _unsubscribeAll: Subject<any>;
    private incident: StaffIncident;

    routeParams: any;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {CommonService} _commonService
     * @param {NGXLogger} _logger
     * @param {StaffIncidentService} _staffIncidentService
     */
    constructor(
        private _httpClient: HttpClient,
        private _commonService: CommonService,
        private _logger: NGXLogger,
        private _staffIncidentService: StaffIncidentService,
    ) {
        // Set the defaults
        this.onIncidentChanged = new BehaviorSubject([]);
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

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {

        this.routeParams = route.params;

        return new Promise((resolve, reject) => {
            Promise.all([
                this.getIncident(this.routeParams.id)
            ])
            .then(([incident]: [any]) => {
                resolve();
            })
            .catch(error => {
                reject(error);
            });
        });

    }

    /**
     * Get incident item
     * 
     * @returns {Promise<any>}
     */
    getIncident(index: string): Promise<any> {
       
        return new Promise((resolve, reject) => {
            if (index) {
                this._staffIncidentService
                    .getIncident(index)
                    .pipe(first())
                    .subscribe(
                        (response) => {
                            this.onIncidentChanged.next(response);

                            resolve();
                        },
                        reject
                    );
            }
            else {
                this.onIncidentChanged.next(false);
                resolve(false);
            }
        });
    }

}

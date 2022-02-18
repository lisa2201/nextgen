import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {first, map, shareReplay} from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { browserRefresh } from 'app/app.component';

import { ChildrenService } from './children.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Child } from '../child.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import {BusListService} from '../../service-settings/bus-list/services/bus-list.service';
import {AppConst} from '../../../../shared/AppConst';
import { Bus } from '../../service-settings/bus-list/bus-list.model';
import { School } from '../../service-settings/bus-list/school-list.model';

@Injectable()
export class ChildService
{
    onChildChanged: BehaviorSubject<any>;
    onBusListChange: BehaviorSubject<any>;
    onSchoolListChange: BehaviorSubject<any>;

    routeParams: any;

    private child: Child;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildrenService} _childrenService
     * @param _notificationService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _childrenService: ChildrenService,
        private _notificationService: NotificationService,
    )
    {
        // Set the defaults
        this.onChildChanged = new BehaviorSubject([]);
        this.onBusListChange = new BehaviorSubject([]);
        this.onSchoolListChange = new BehaviorSubject([]);
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
                this.getChild(this.routeParams.id),
                this.getBusList(this.routeParams.id),
                this.getSchoolList(this.routeParams.id)
            ])
            .then(([child]: [any, any, any]) =>
            {
                resolve();
            })
            .catch(errorResponse => 
            {
                if (browserRefresh && state.url !== '')
                {
                    if (errorResponse && errorResponse.error)
                    {
                        this._notificationService.displaySnackBar(errorResponse.error.message, NotifyType.ERROR);
                    }

                    this._router.navigate([_.head(_.filter(state.url.split('/'), _.size))]);
                }

                reject(errorResponse);
            });
        });
    }

    /**
     * Get child item
     * 
     * @returns {Promise<any>}
     */
    getChild(index: string): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            if (index === 'new')
            {
                this.onChildChanged.next(false);
                
                resolve(false);
            }
            else
            {
                this._childrenService
                    .getChild(index)
                    .pipe(first())
                    .subscribe(
                        (response) =>
                        {
                            this.child = response;

                            this.onChildChanged.next(this.child);
                            
                            resolve();
                        },
                        reject
                    );

            }
        });
    }


    /**
     * Get child item
     *
     * @returns {Promise<any>}
     */
    getBusList(index: string): Promise<void>
    {
        return new Promise((resolve, reject) => {

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-bus-list`)
                .pipe(
                    map((response) => {

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : response.data.map((i: any, idx: number) => new Bus(i, idx)),
                        };

                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        this.onBusListChange.next(response);
                        resolve();
                    },
                    reject
                );
        });
    }


    /**
     * Get child item
     *
     * @returns {Promise<any>}
     */
    getSchoolList(index: string): Promise<void>
    {
        return new Promise((resolve, reject) => {

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-school-list`)
                .pipe(
                    map((response) => {

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : response.data.map((i: any, idx: number) => new School(i, idx)),
                        };

                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        this.onSchoolListChange.next(response);
                        resolve();
                    },
                    reject
                );
        });
    }

    getSchoolBusList(schoolID: string = ''): Observable<any> {
        let params = new HttpParams();
        params = params.set('schoolID', schoolID);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-school-busses`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response;
                }),
                shareReplay()
            );
    }

}

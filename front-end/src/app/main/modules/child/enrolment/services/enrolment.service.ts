import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { first, map, shareReplay } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { browserRefresh } from 'app/app.component';

import { ChildrenService } from '../../services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { AppConst } from 'app/shared/AppConst';
import { Child } from '../../child.model';
import { Enrolment } from '../models/enrolment.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Booking } from '../../booking/booking.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { EnrolmentHistory } from '../models/enrolment-history.model';
import { EnrolmentEntitlement } from '../models/entitlement.model';

@Injectable()
export class ChildEnrolmentService
{
    onChildChanged: BehaviorSubject<any>;
    onChildEnrolmentChanged: BehaviorSubject<any>;
    onEnrolmentDependencyChanged: BehaviorSubject<any>;
    onEnrolmentBookingUpdateFound: BehaviorSubject<any>;

    onEnrolmentTabViewLoaderChanged: Subject<number>;

    routeParams: any;

    private child: Child;
    private enrolment: Enrolment;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildrenService} _childrenService
     * @param {NotificationService} _notificationService
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
        this.onChildEnrolmentChanged = new BehaviorSubject([]);
        this.onEnrolmentDependencyChanged = new BehaviorSubject([]);
        this.onEnrolmentBookingUpdateFound = new BehaviorSubject(false);

        this.onEnrolmentTabViewLoaderChanged = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resolver
     *
     * @param {ActivatedRouteSnapshot} route
     * @param {RouterStateSnapshot} state
     * @returns {(Observable<any> | Promise<any> | any)}
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any
    {
        this.routeParams = route.params;

        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this.getChild(this.routeParams.id),
                this.getEnrolment(this.routeParams.enrolment_id),
                this.getDependency(this.routeParams.id).toPromise()
            ])
            .then(([child, enrolment, dependency]: [any, any, any]) => 
            {
                this.setEvents(dependency);

                resolve(dependency);
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
     * set events after resolve
     */
    setEvents(dependencies: any = null): void
    {
        if (!_.isEmpty(dependencies))
        {
            this.onEnrolmentDependencyChanged.next(dependencies);
        }
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
            this._childrenService
                .getChild(index)
                .pipe(first())
                .subscribe(
                    (response) =>
                    {
                        this.child = response;

                        this.onChildChanged.next(this.child);
                        
                        resolve(this.child);
                    },
                    reject
                );
        });
    }

    /**
     * get enrolment item
     *
     * @param {string} index
     * @returns {Promise<any>}
     */
    getEnrolment(index: string): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            if (index)
            {
                const params = new HttpParams()
                    .set('index', index);
                
                return this._httpClient
                    .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrolment-info`, { params })
                    .pipe(
                        map(response =>
                        {
                            return {
                                item: new Enrolment(response.data.enrolment),
                                hasUpdate: response.data.has_update
                            };
                        }),
                        shareReplay()
                    )
                    .subscribe(
                        (response: any) =>
                        {
                            this.enrolment = response.item;

                            this.onChildEnrolmentChanged.next(this.enrolment);

                            this.onEnrolmentBookingUpdateFound.next(response.hasUpdate);

                            resolve(this.enrolment);
                        },
                        reject
                    );
            }
            else
            {
                this.onChildEnrolmentChanged.next(null);

                resolve(null); 
            }
        });
    }

    /**
     * get enrolment dependency
     *
     * @param {string} index
     * @returns {Observable<any>}
     */
    getDependency(index: string): Observable<any>
    {
        const params = new HttpParams()
            .set('index', index)
            .set('skip', typeof this.routeParams.enrolment_id !== 'undefined' ? '0' : '1');
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/enrolment-data`, { params })
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
                            fees: response.data.fees.map((i: any, idx: number) => new Fee(i, idx)),
                            arrangement_types: response.data.arrangement_types,
                            reason_for_pea: response.data.reason_for_pea,
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * get enrolment bookings by start date
     *
     * @param {string} date
     * @returns {Observable<any>}
     */
    getBookings(date: string, type: string): Observable<any>
    {
        const params = new HttpParams()
            .set('index', this.child.id)
            .set('type', type)
            .set('date', date);
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrolment-bookings`, { params })
            .pipe(
                map(response => response.data.map((i, idx) => new Booking(i, idx))),
                shareReplay()
            );
    }

    /**
     * save child enrollment
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    storeEnrolment(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/save-enrolment`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        return {
                            item: new Enrolment(response.data),
                            message: response.message
                        };
                    }
                    else
                    {
                        return { message: response.message };    
                    }
                }),
                shareReplay()
            );
    }

    /**
     * update child enrolment
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    updateEnrolment(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-enrolment`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        return {
                            item: new Enrolment(response.data),
                            message: response.message
                        };
                    }
                    else
                    {
                        return { message: response.message };    
                    }
                }),
                shareReplay()
            );
    }

    /**
     * set child/individual crn
     *
     * @param {any} data
     * @returns {Observable<any>}
     */
    setCRN(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/set-crn`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * submit enrolment form
     *
     * @param {any} data
     * @returns {Observable<any>}
     */
    submitEnrolment(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/submit-enrolment`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        return {
                            item: new Enrolment(response.data),
                            message: response.message
                        };
                    }
                    else
                    {
                        return { message: response.message };    
                    }
                }),
                shareReplay()
            );
    }

    /**
     * check enrollment status
     *
     * @param {string} id
     * @returns {Observable<any>}
     */
    checkEnrolmentStatus(id: string): Observable<any>
    {
        const params = new HttpParams()
            .set('index', id);
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/check-enrolment-status`, { params })
            .pipe(
                map(response => new Enrolment(response.data)),
                shareReplay()
            );
    }

    /**
     * check enrollment history
     *
     * @param {string} id
     * @returns {Observable<any>}
     */
    getEnrolmentHistory(id: string): Observable<any>
    {
        const params = new HttpParams()
            .set('index', id);
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrolment-history`, { params })
            .pipe(
                map(response => response.data.map((i: any) => new EnrolmentHistory(i))),
                shareReplay()
            );
    }

    /**
     * get enrolment entitlement
     *
     * @param {*} index
     * @param {*} date
     * @returns {Observable<any>}
     */
    getEntitlement(id: string): Observable<any>
    {
        const params = new HttpParams()
            .set('index', id);
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrolment-entitlement`, { params })
            .pipe(
                map(response => new EnrolmentEntitlement(response.data)),
                shareReplay()
            );
    }

    /**
     * import enrolment
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    verifyEnrolment(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/verify-enrolment`, data)
            .pipe(
                map(response => 
                {
                    return {
                        items: response.data.map((i: any, idx: number) => new Enrolment(i, idx)),
                        message: response.message
                    };
                }),
                shareReplay()
            );
    }

    /**
     * Delete a enrolment
     * 
     * @returns {Observable<any>}
     */
    delete(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-enrolment`, { params })
            .pipe(
                map(response =>
                {
                    return {
                        list: response.data.map((i, idx) => new Enrolment(i, idx)),
                        message: response.message
                    }
                }),
                shareReplay()
            );
    }

    /**
     * close enrolment
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    closeEnrolment(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/close-enrolment`, data)
            .pipe(
                map(response => 
                {
                    return {
                        item: new Enrolment(response.data),
                        message: response.message
                    };
                }),
                shareReplay()
            );
    }

    /**
     * read enrolment info from api
     *
     * @param {string} enrolmentOd
     * @returns {Observable<any>}
     */
    getEnrolmentFromApi(enrolmentOd: string): Observable<any>
    {
        const params = new HttpParams()
            .set('enrolment', enrolmentOd);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrolment`, { params })
            .pipe(
                map(response => response.data),
                shareReplay()
            );
    }

    /**
     * Unsubscribe options
     */
    unsubscribeOptions(): void
    {
        // reset all variables
        this.child = null;
        this.enrolment = null;
    }
}

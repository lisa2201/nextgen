import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import { HttpParams, HttpClient } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';
import {first, map, shareReplay} from 'rxjs/operators';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { browserRefresh } from 'app/app.component';
import * as _ from 'lodash';
import { BookingRequest } from '../booking-request.model';
import {Child} from '../../child.model';
import {ChildrenService} from '../../services/children.service';

@Injectable()
export class BookingRequestService {

    routeParams: any;
    bookingRequest: BookingRequest[];
    private child: Child;
    private _unsubscribeAll: Subject<any>;

    onChildChanged: BehaviorSubject<any>;

    constructor(
        private _httpClient: HttpClient,
        private _router: Router,
        private _childrenService: ChildrenService,
    ) {
        this.onChildChanged = new BehaviorSubject([]);
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
                this.getBookingRequests(this.routeParams.id),
                this.getChild(this.routeParams.id),
            ])
                .then(([requests, child]: [any, any]) => {
                    this.bookingRequest = requests;

                    resolve(requests);

                })
                .catch(error => {
                    if (browserRefresh && state.url !== '') {
                        this._router.navigate([_.head(_.filter(state.url.split('/'), _.size))]);
                    }

                    reject(error);
                });
        });
    }


    /**
     * Get enrollment details
     * 
     * @returns {Observable<any>}
     */
    get(index: any): Observable<any> {

        const params = new HttpParams().set('child_id', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-booking-requests`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new BookingRequest(i, idx))),
                shareReplay()
            );

    }

    /**
     * Get user item
     * 
     * @returns {Promise<any>}
     */
    getBookingRequests(index: any): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            if (index) {
                this.get(index)
                    .pipe()
                    .subscribe(
                        (response) => resolve(response),
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

                        resolve();
                    },
                    reject
                );
        });
    }
}

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { AppConst } from 'app/shared/AppConst';
import { map, shareReplay, finalize } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import * as _ from 'lodash';

@Injectable({
    providedIn: 'root',
})
export class HomeService {
    onHomeLoad: BehaviorSubject<any>;
    onTableLoaderChanged: any;

    constructor(private _httpClient: HttpClient) {
        this.onHomeLoad = new BehaviorSubject([]);
    }

    /**
     * Resolver
     *
     * @param {ActivatedRouteSnapshot} route
     * @param {RouterStateSnapshot} state
     * @returns {Observable<any> | Promise<any> | any}
     */
    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        return new Promise((resolve, reject) => {
            Promise.all([this.getChildren()               
            ])
                .then(
                    ([children]: [any]) => {
                        resolve();
                    }
                )
                .catch((error) => {
                    reject(error);
                });
        });
    }

    getChildren(): Observable<any> {
      
        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-list-parent`)
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    getBalance(childId: string = ''): Observable<any> {
      
        let params = new HttpParams();
        params = params.set('child_id', childId);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-balance`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    getPayments(childId: string = ''): Observable<any> {
      
        let params = new HttpParams();
        params = params.set('child_id', childId);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-daily-child-payments`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    getBookings(childId: string = ''): Observable<any> {
      
        let params = new HttpParams();
        params = params.set('child_id', childId);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-daily-child-bookings`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    getYTD(childId: string = ''): Observable<any> {
      
        let params = new HttpParams();
        params = params.set('child_id', childId);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-ytd`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }
}

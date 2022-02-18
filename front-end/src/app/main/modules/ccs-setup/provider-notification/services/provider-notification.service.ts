import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
    ActivatedRouteSnapshot,
    Resolve,
    RouterStateSnapshot
} from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize, pluck } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { CcsSetup } from '../../ccs-setup.model';
import { ProviderMessage } from '../model/provider-message.model';
import { CorrenpondenceList } from '../model/correspondence-list.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Injectable()
export class ProviderNotificationService implements Resolve<any> {
    onMessageChanged: BehaviorSubject<any>;
    onCorrenpondenceListChanged: BehaviorSubject<any>;
    onMessageChangedCount: BehaviorSubject<any>;
    onMessageChangedfilterAfterStore: BehaviorSubject<any>;
    onCcsStatusChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onFilterRangeChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    onTableLoaderChangedCore: Subject<any>;

    onCorrespondenceFilterChanged: Subject<any>;

    actualTotal: number;
    displayTotal: number;

    private messagelist: ProviderMessage[];
    private correspondencelist: CorrenpondenceList[];
    private _unsubscribeAll: Subject<any>;
    filterBy: any = '0';
    // flterByRange: any;
    filterByRange = {
        sDate: '',
        eDate: ''
    };
    correspondenceFilterBy: any;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(private _httpClient: HttpClient, private _logger: NGXLogger) {
        // Set the defaults
        this.onMessageChanged = new BehaviorSubject([]);
        this.onCorrenpondenceListChanged = new BehaviorSubject([]);
        this.onMessageChangedCount = new BehaviorSubject([]);
        this.onMessageChangedfilterAfterStore = new BehaviorSubject([]);
        // this.onCcsStatusChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.onFilterRangeChanged = new Subject();
        this.onCorrespondenceFilterChanged = new Subject();
        this.filterBy = null;
        this.correspondenceFilterBy = null;
        // this.flterByRange = null;
        this._unsubscribeAll = new Subject();
        this.actualTotal = 0;
        this.displayTotal = 0;
        this.onTableLoaderChanged = new Subject();
        this.onTableLoaderChangedCore = new Subject();
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
    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        return new Promise((resolve, reject) => {
            Promise.all([])
                .then(([message]: [any]) => {
                    this.onFilterChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(filter => {
                            this.filterBy = filter;

                            this.getMessageData();
                        });

                    this.onCorrespondenceFilterChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(filter => {
                            this.correspondenceFilterBy = filter;
                            this.getCorrespodenceList();
                        });

                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * Get message list
     *
     * @returns {Promise<any>}
     */

    getMessageData(): Promise<any> {
        this.onTableLoaderChanged.next(true);

        const params = new HttpParams().set(
            'filters',
            (this.filterBy) ? JSON.stringify(this.filterBy) : JSON.stringify({ sDate : DateTimeHelper.getUtcDate(new Date()),eDate : DateTimeHelper.getUtcDate(new Date())})
        );

        return new Promise((resolve, reject) => {
            this._httpClient
                .get<any>(
                    `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-message-list`,
                    { params }
                )
                .pipe(
                    map(response => response),
                    finalize(() =>
                        setTimeout(
                            () => this.onTableLoaderChanged.next(false),
                            200
                        )
                    ),
                    shareReplay()
                )
                .subscribe((response: any) => {
                    this.messagelist = response.data.results.map(i => new ProviderMessage(i));
                    this.displayTotal = response.data.results.length;
                    this.onMessageChanged.next([...this.messagelist]);
                    resolve();
                }, reject);
        });
    }

    /**
     * Get correspondece list
     *
     * @returns {Promise<any>}
     */

    getCorrespodenceList(): Promise<any> {
        this.onTableLoaderChangedCore.next(true);

        const params = new HttpParams()
            .set('filters', JSON.stringify(this.correspondenceFilterBy));

        return new Promise((resolve, reject) => {
            this._httpClient
                .get<any>(
                    `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-correspondece-list`,
                    { params }
                )
                .pipe(
                    map(response => response),
                    finalize(() =>
                        setTimeout(
                            () => this.onTableLoaderChangedCore.next(false),
                            200
                        )
                    ),
                    shareReplay()
                )
                .subscribe((response: any) => {
                    this.correspondencelist = response.data.results.map(i => new CorrenpondenceList(i));
                    this.displayTotal = response.data.results.length;

                    this.onCorrenpondenceListChanged.next([
                        ...this.correspondencelist
                    ]);

                    resolve();
                }, reject);
        });
    }

    getCorrepondence(index: string): Observable<any> {
        this.onTableLoaderChangedCore.next(true);
        const params = new HttpParams().set('link', JSON.stringify(index));

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-correspondence`,
                { params }
            )
            .pipe(
                map(depends => {
                    setTimeout(() => this.onTableLoaderChangedCore.next(false), 200);
                    return depends.data;
                }),
                shareReplay()
            );
    }

    unsubscribeOptions(): void {
        this.filterBy = null;
        this.correspondenceFilterBy = null;
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._unsubscribeAll = new Subject();
    }
    
}

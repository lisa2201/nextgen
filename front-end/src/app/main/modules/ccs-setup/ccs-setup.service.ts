import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
    ActivatedRouteSnapshot,
    Resolve,
    RouterStateSnapshot
} from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize, pluck, take } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { CcsSetup } from './ccs-setup.model';
import { SortProp } from 'app/shared/interface/sort';

@Injectable()
export class CcsSetupService implements Resolve<any> {

    private _unsubscribeAll: Subject<any>;
    private ccslist: CcsSetup[];

    onCcsChanged: BehaviorSubject<any>;
    onPaginationChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onFilterChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 25;
    defaultPageSizeOptions: number[] = [25, 50, 75, 100];

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    searchText: string | null = null;

    actualTotal: number;
    displayTotal: number;
    validDataCount: boolean;

    /**11
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(private _httpClient: HttpClient, private _logger: NGXLogger) {

        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this._unsubscribeAll = new Subject();

        this.onCcsChanged = new BehaviorSubject([]);
        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterBy = {
            status: '0'
        };
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

        return this.getCcsDatas()
            .then(() => {
                this.setEvents();
            })
            .catch((error) => {
                throw error;
            });

    }

    /**
     * Get branch list
     *
     * @returns {Promise<any>}
     */ 
    getCcsDatas(): Promise<any> {
         
        return new Promise((resolve, reject) => {

            this.onTableLoaderChanged.next(true);

            if (_.isNull(this.pagination)) {
                // set default value
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            }

            const params = new HttpParams()
                .set('page', this.pagination.page)
                .set('offset', this.pagination.size)
                .set('search', this.searchText)
                .set('sort', JSON.stringify(this.sortBy))
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient
                .get<any>(
                    `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-ccs-list`,
                    { params }
                )
                .pipe(
                    take(1),
                    map(response => {

                        this.ccslist = response.data.map((i: any, idx: number) => new CcsSetup(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.ccslist],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        };

                    }),
                    finalize(() =>
                        setTimeout(
                            () => this.onTableLoaderChanged.next(false),
                            200
                        )
                    ),
                    shareReplay()
                )
                .subscribe((response: any) => {

                    this.onCcsChanged.next(response);

                    resolve(null);

                }, reject);
        });
    }
    /**
     * Create new branch
     *
     * @returns {Observable<any>}
     */
    storeCcsData(data: object): Observable<any> {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-ccs`,
                data
            )
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        const item = new CcsSetup(response.data);
                        item.isNew = true;

                        this.filterBy = '0';
                        this.getCcsDatas();
                    }
                    return response.message;
                }),
                shareReplay()
            );
    }

    getCcsdata(index: string): Observable<any> {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-ccs-info`,
                { params }
            )
            .pipe(
                map(ccs => ccs.data),
                // pluck('data'),
                shareReplay()
            );
    }

    updateCcs(data: object): Observable<any> {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-ccs`,
                data
            )
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        setTimeout(
                            () => this.onCcsChanged.next([...this.ccslist]),
                            350
                        );
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * set events
     */
    setEvents(): void {

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => {
                this.searchText = searchText;
                this.getCcsDatas();
            });

        this.onSortChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(sort => {
                this.sortBy = sort;
                this.getCcsDatas();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination)) {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.getCcsDatas();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;
                this.getCcsDatas();
            });

    }

    /**
     * unsubscribe
     */
    unsubscribeOptions(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        // reset all variables
        this.pagination = null;
        this.filterBy = {
            status: '0'
        };
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
        this.ccslist = [];
    }

}

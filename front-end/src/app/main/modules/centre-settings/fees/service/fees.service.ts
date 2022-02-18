import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { Fee } from '../model/fee.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { AdjustedFee } from '../model/fee-adjusted.model';

@Injectable()
export class FeesService implements Resolve<any> 
{
    private _unsubscribeAll: Subject<any>;
    
    feesList: Fee[];
    
    onFeesChanged: BehaviorSubject<any>;
    onCcsChangedCount: BehaviorSubject<any>;
    onCcsChangedfilterAfterStore: BehaviorSubject<any>;
    onCcsStatusChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onPaginationChanged: Subject<PaginationProp>;
    
    defaultPageIndex: any = 1;
    defaultPageSize: any = 25;
    defaultPageSizeOptions: number[] = [25, 50 ,75, 100];

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    actualTotal: number;
    displayTotal: number;
    validDataCount: boolean;
    searchText: string | null = null;

    filterBy: any = '0';

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient, 
        private _logger: NGXLogger
    ) 
    {
        // Set the defaults
        this.onFeesChanged = new BehaviorSubject([]);
        this.onCcsChangedCount = new BehaviorSubject([]);
        this.onCcsChangedfilterAfterStore = new BehaviorSubject([]);

        this.onCcsStatusChanged = new Subject();
        this.onFilterChanged = new Subject();
        this._unsubscribeAll = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onPaginationChanged = new Subject();

        this.filterBy = '1';
        this.actualTotal = 0;
        this.displayTotal = 0;
        this.validDataCount = true;
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
            Promise.all([this.getFeesData()])
                .then(([fees]: [any]) => {
                    this.setEvent();

                    resolve(null);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    setEvent(): void 
    {
        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter.status;
                this.getFeesData();
            });

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => {
                this.searchText = searchText;
                this.getFeesData();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination =>
            {
                this.pagination = pagination;
                
                this.getFeesData();
            });
    }

    getDependency(): Observable<any> 
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/fee-data`, {})
            .pipe(
                map(depends => depends.data.map((i: any, idx: number) => new Room(i, idx))),
                shareReplay()
            );
    }

    getFeesData(): Promise<any>
    {
        this.onTableLoaderChanged.next(true);

        if (_.isNull(this.pagination))
        {
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
            .set('filters', JSON.stringify(this.filterBy));

        return new Promise((resolve, reject) => {
            this._httpClient
                .get<any>(
                    `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-list-fees`,
                    { params }
                )
                .pipe(
                    map(response => response),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe((response: any) => 
                {
                    this.feesList = response.data.map((i: any) => new Fee(i));

                    this.onFeesChanged.next({
                        feeList: [...this.feesList],
                        totalRecords: [response.totalRecords],
                        totalDisplay: [response.displayRecord],
                    });

                    resolve(null);
                }, reject);
        });
    }

    storeFee(data: object): Observable<any> 
    {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/store-fees`,
                data
            )
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        this.getFeesData();
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * Get fee item
     * 
     * @returns {Observable<any>}
     */
    getFee(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-fee-info`, { params })
            .pipe(
                map(response => new Fee(response.data)),
                shareReplay()
            );
    }

    updateFee(data: object): Observable<any> 
    {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-fees`,
                data
            )
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        this.getFeesData();
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    adjustFee(data: object): Observable<any> 
    {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/adjust-fees`,
                data
            )
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        this.getFeesData();
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    updateStatus(data: object): Observable<any> 
    {
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-fees-status`,
                data
            )
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        this.getFeesData();
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    deleteFee(index: string): Observable<any> 
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-fees`, { params })
            .pipe(
                map(response => 
                {
                    this.getFeesData();

                    return response.message;
                }),
                shareReplay()
            );
    }

    getAdjustedList(index: string): Observable<any> 
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/adjusted-list`, { params })
            .pipe(
                map(depends => depends.data.map((i, idx) => new AdjustedFee(i, idx))),
                shareReplay()
            );
    }

    deleteAdjustedFee(index: string): Observable<any> 
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-adjusted-fee`,
                { params }
            )
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    resetDeclarations(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        
        this._unsubscribeAll = new Subject();

        this.filterBy = '0';
        this.searchText = null;
        this.pagination = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
    }
}

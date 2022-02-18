import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { BondPayment } from '../model/bond-payment.model';
import { User } from 'app/main/modules/user/user.model';
import { Child } from 'app/main/modules/child/child.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { SortProp } from 'app/shared/interface/sort';
import { FinanceAccount } from '../../finance-accounts/finance-account.model';



@Injectable()
export class BondPaymentservice implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;
    private bondPayment: BondPayment[];
    users: User[];
    onBondChanged: BehaviorSubject<any>;
    onUserChanged: BehaviorSubject<any>;
    onChildChanged: BehaviorSubject<any>;
    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onDefaultFilterChanged: BehaviorSubject<any>;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 25;
    defaultPageSizeOptions: number[] = [25, 50 ,75, 100];

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    searchText: string | null = null;
    defaultFilter: any = {
        type: null,
        child: '',
        user: '',
        amount: null,
        comments: null,
        parent_status: '0'
    };

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
    ) {
        // Set the defaults
        this._unsubscribeAll = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterBy = {...this.defaultFilter};

        this.onBondChanged = new BehaviorSubject([]);
        this.onUserChanged = new BehaviorSubject([]);
        this.onChildChanged = new BehaviorSubject([]);
        this.onDefaultFilterChanged = new BehaviorSubject({...this.defaultFilter});
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

        return new Promise((resolve, reject) => {
            Promise.all([
                this.getBondPayments(),
                this.getUsers()
            ])
                .then(([roles, user]: [any, User]) => {
                    
                    this.setEvents();
                    resolve(null);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    setEvents(): void
    {

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText =>
            {
                this.searchText = searchText;

                this.getBondPayments();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination))
                {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.getBondPayments();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination =>
            {
                this.pagination = pagination;
                
                this.getBondPayments();
            });
    }

    /**
     * Get role list
     *
     * @returns {Promise<any>}
     */
    getBondPayments(): Promise<any> {
        return new Promise((resolve, reject) => {

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
                .set('sort', JSON.stringify(this.sortBy))
                .set('filters', JSON.stringify(this.filterBy));

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-bond-payment-list`, {params})
                .pipe(
                    map(response => 
                        {
                            this.bondPayment = response.data.map((i: any, idx: number) => new BondPayment(i, idx));
    
                            this.totalDisplayRecords = response.displayRecord ? response.displayRecord : 0;
                            this.totalRecords = response.totalRecords;
                            this.isFiltered = response.filtered;
    
                            return {
                                items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.bondPayment],
                                totalDisplay: this.totalDisplayRecords,
                                total: this.totalRecords,
                                filtered: this.isFiltered
                            };
                        }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        
                        this.onBondChanged.next(response);

                        resolve(null);
                    },
                    reject
                );
        });
    }


    getUsers(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            const params = new HttpParams()
            .set('view-parent', '1')
            .set('parents-only','1' );

            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-all-active-parents`, { params })
                .pipe(
                    map((response: any) => {
                        this.users = response.data.map((i, idx) => new FinanceAccount(i));
                        this.onUserChanged.next([...this.users]);
                        return response.data.map((i, idx) => new FinanceAccount(i));
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>  resolve(response),
                    reject
                );
            
        });
    }

    getChildren(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
           
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-list`, {})
                .pipe(
                    map((response: any) => {
                        return response.data.map((i, idx) => new Child(i));
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
            
        });
    }

    storeBond(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-bond-payment`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new BondPayment(response.data);
                        item.isNew = true;

                        this.getBondPayments();
                        // this.bondPayment = this.bondPayment.concat(item).map((v, i) =>
                        // {
                        //     v.index = i;
                        //     return v;
                        // });

                        // setTimeout(() => this.onBondChanged.next({
                        //     items: this.bondPayment,
                        //     totalDisplay: this.totalDisplayRecords + 1,
                        //     total: this.totalRecords + 1,
                        //     filtered: this.isFiltered
                        // }), 500);
                    }
                    return response.message;
                }),
                shareReplay()
            );
    }

    deleteBond(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-bond-payment`, { params })
            .pipe(
                map(response => 
                    {
                        this.bondPayment = this.bondPayment.filter((i) => i.id !== index).map((v, i) =>
                        {
                            v.index = i;
                            return v;
                        });
    
                        setTimeout(() => this.onBondChanged.next({
                            items: this.bondPayment,
                            totalDisplay: this.totalDisplayRecords - 1,
                            total: this.totalRecords - 1,
                            filtered: this.isFiltered
                        }), 500);
    
                        return response.message;
                    }),
                shareReplay()
            );
    }

    
    updateBond(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-bond-payment`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new BondPayment(response.data);
                        
                        const index = this.bondPayment.findIndex((val) => val.id === item.id);

                        item.isNew = true;
                        this.getBondPayments();
                        // item.index = this.bondPayment[index].index;

                        // this.bondPayment[index] = item;

                        // setTimeout(() => this.onBondChanged.next({
                        //     items: this.bondPayment,
                        //     totalDisplay: this.totalDisplayRecords,
                        //     total: this.totalRecords,
                        //     filtered: this.isFiltered
                        // }), 500);
                    }
                    return response.message;
                }),
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
        this.pagination = null;
        this.filterBy = {...this.defaultFilter};
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
    }

    clearLastRememberOptions(): void
    {
        this.pagination = null;
        this.filterBy = {...this.defaultFilter};
        this.isFiltered = false;
    }

}

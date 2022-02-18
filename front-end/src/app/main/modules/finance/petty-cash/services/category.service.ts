import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject, of, forkJoin } from 'rxjs';
import { shareReplay, map, finalize, takeUntil, switchMap, first } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';

import { PaginationProp } from 'app/shared/interface/pagination';
import { SortProp } from 'app/shared/interface/sort';
import { BranchService } from 'app/main/modules/branch/services/branch.service';
import { RoomService } from 'app/main/modules/room/services/room.service';
import { Category } from '../model/category.model';

@Injectable()
export class CategoryService implements Resolve<any> {
    
    private _unsubscribeAll: Subject<any>;

    private category: Category[];

    onCategoryChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;

    paginationMeta: any;
    defaultPageIndex: any = 1;
    defaultPageSize: any = 5;
    defaultPageSizeOptions: number[] = [5, 10, 20];

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    searchText: string | null = null;
    currentPageIndex: any = 1;

    /**
     * Constructor
     *
     * @param {AuthService} _authService
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {BranchService} _branchService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
    )
    {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;
        this.paginationMeta = null;

        this.onCategoryChanged = new BehaviorSubject([]);

        this.onPaginationChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onViewLoaderChanged = new Subject();

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
        return new Promise<void>((resolve, reject) =>
        {
            console.log('resolver work');
            
            Promise.all([
                this.getCategory()
            ])
            .then(() => 
            {
                
                this.setEvents();

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
    setEvents(users: any[] = []): void
    {

        // this.rooms = rooms;
        // this.onRoomsChanged.next([...this.rooms]);
        // this.onCategoryChanged.next(users);

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText =>
            {
                this.searchText = searchText;
                this.getCategory();
            });


        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {

                this.pagination = pagination;
                console.log('service working');
                
                this.getCategory();
            });

            
    }


    getPaginationOptions(): any {
        return this.pagination;
    }

    /**
     * Get user list on resolve
     *
     * @returns {Observable<any>}
     */
    getCategory(): Promise<any>
    {
        // set table loader
        this.onViewLoaderChanged.next(true);

        // set default value
        if (_.isNull(this.pagination))
        {
            this.pagination = {
                page: this.currentPageIndex,
                size: this.defaultPageSize
            };
        }
       
        let params = new HttpParams()
            .set('page', this.pagination.page)
            .set('offset', this.pagination.size)
            .set('search', this.searchText);
            
        return new Promise((resolve, reject) => 
        {
            return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-category-list`, {params})
            .pipe(
                map(response =>{
                    this.onViewLoaderChanged.next(false);
                    this.category = response.data.map((i: any, idx: number) => new Category(i, idx));

                    this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                    this.totalRecords = response.totalRecords;
                    this.isFiltered = response.filtered;

                    this.onCategoryChanged.next(
                        {
                            items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.category],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        });

                    return {
                        items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.category],
                        totalDisplay: this.totalDisplayRecords,
                        total: this.totalRecords,
                        filtered: this.isFiltered
                    };
                }),
                shareReplay()
            )
            .subscribe(
                (response: any) => {
                    resolve(response),
                    reject
                }
            );
        });
    
    }

    getAllCategory(type: string, withTrashed: string): Promise<any>
    {
        let params = new HttpParams()
            .set('type', type)
            .set('withTrashed', withTrashed);
        return new Promise((resolve, reject) => 
        {
            return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-categories`, {params})
            .pipe(
                map(response =>{

                    return response.data.map((i: any, idx: number) => new Category(i, idx));

                }),
                shareReplay()
            )
            .subscribe(
                (response: any) => {
                    resolve(response),
                    reject
                }
            );
        });
    
    }
    

    storeCategory(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-category`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    
                    this.getCategory();

                    return response;
                }),
                shareReplay()
            );
    }

    
    updateCategory(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-category`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    
                    this.getCategory();

                    return response;
                }),
                shareReplay()
            );
    }

    delete(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-category`, { params })
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getCategory();
                    
                    return response.message;
                }),
                shareReplay()
            );
    }



    setCurrentPageIndex(id: string): void
    {
        this.currentPageIndex = id;
    }


    /**
     * Unsubscribe options
     */
    unsubscribeOptions(rememberLastOptions: boolean = false): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize
        this._unsubscribeAll = new Subject();

        // reset all variables
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;

        if (!rememberLastOptions)
        {
            this.clearLastRememberOptions();
        }
    }

    /**
     * clear all last remembered options
     */
    clearLastRememberOptions(): void
    {
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

    
}

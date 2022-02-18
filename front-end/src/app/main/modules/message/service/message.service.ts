import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize, take } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { BranchService } from '../../branch/services/branch.service';
import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';

import { Role } from '../../role/role.model';
import { Branch } from '../../branch/branch.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { Invitation } from '../../invitation/invitation.model';
import { SortProp } from 'app/shared/interface/sort';

@Injectable()
export class QueryMessageService
{
    private _unsubscribeAll: Subject<any>;

    private message: any[];
    eventsSet: boolean;

    onMessageChanged: BehaviorSubject<any>;
    onFilterBranchesChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onPageSizeChanged: Subject<any>;

    pageData: BehaviorSubject<{currentPage: number, pageSize: number, lastPage: boolean}>;

    filterData: BehaviorSubject<any>;
    
    currentPage: any;
    currentPageSize: any;
    lastPage: boolean;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 10;
    defaultPageSizeOptions: number[] = [5, 10, 20];

    onQueryByFilter: Subject<any>;
    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    searchText: string | null = null;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {BranchService} _branchService
     * @param {AuthService} _authService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _branchService: BranchService,
        private _authService: AuthService
    )
    {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;
        this.eventsSet = false;
        this.onMessageChanged = new BehaviorSubject([]);
        this.onFilterBranchesChanged = new BehaviorSubject([]);
        
        this.onQueryByFilter = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterData = new BehaviorSubject(null);
        this.onPageSizeChanged = new Subject();
        this.currentPageSize = this.defaultPageSize;
        this._unsubscribeAll = new Subject();

        this.pageData = new BehaviorSubject({currentPage: this.defaultPageIndex, lastPage: this.lastPage, pageSize: this.defaultPageSize});
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
    /**
     * set events after resolve
     */
    setEvents(branches: Branch[] = []): void
    {
        if (!_.isEmpty(branches))
        {
            this.onFilterBranchesChanged.next(branches);
        }

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

                this.getMessages(null);
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination =>
            {
                this.pagination = pagination;
                
                this.getMessages(null);
            });

        this.onPageSizeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageSize: number) => {
                this.currentPageSize = pageSize;
            });
    }


    // getMessages(): Promise<any>
    // {
    //     // set table loader
    //     this.onTableLoaderChanged.next(true);

    //     if (_.isNull(this.pagination))
    //     {
    //         // set default value
    //         this.pagination = {
    //             page: this.defaultPageIndex,
    //             size: this.defaultPageSize
    //         };
    //     }

    //     const params = new HttpParams()
    //         .set('page', this.pagination.page)
    //         .set('offset', this.pagination.size)
    //         .set('search', this.searchText)
    //         .set('filters', JSON.stringify(this.filterBy));
            
    //     return new Promise((resolve, reject) => {
    //         this._httpClient
    //             .get<any>(
    //                 `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-dss-message-list`, { params }
    //             )
    //             .pipe(
    //                 map(response => response),
    //                 finalize(() =>
    //                     setTimeout(
    //                         () => this.onTableLoaderChanged.next(false),
    //                         200
    //                     )
    //                 ),
    //                 shareReplay()
    //             )
    //             .subscribe((response: any) => {
    //                 if (response.data.return_error === 'NO_MESSAGES_FOUND'){
    //                     this.message =  new QueryMessage(response.data);
    //                 }
    //                 else{
    //                     this.message =  response.data.map((i: any, idx: number) => new QueryMessage(i, idx));
    //                 }
                    
                    
    //                 this.onMessageChanged.next({
    //                     noMessage: response.data.return_error === 'NO_MESSAGES_FOUND' ? true : false,
    //                     items: this.message
    //                 });

    //                 resolve();
    //             }, reject);
    //     });
    // }

    getMessages(page: number | null): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onTableLoaderChanged.next(true);

            const params = new HttpParams()
                .set('page', page ? page : this.currentPage)
                .set('offset', this.currentPageSize)
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-dss-message-list`, { params })
                .pipe(
                    take(1),
                    map(response => {
                        
                        if (response.data && response.data.ListOfMessages && response.data.ListOfMessages.Message) {
                            this.message = response.data.ListOfMessages.Message;
                        } else {
                            this.message = null;
                        }

                        if (response.data && response.data.LastPage && response.data.LastPage === 'true') {
                            this.lastPage = true; 
                        } else {
                            this.lastPage = false;
                        }

                        // this.isFiltered = response.filtered;

                        return {
                            items: this.message,
                            lastPage: this.lastPage
                        };
                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onMessageChanged.next(response);

                        if (page) {
                            this.currentPage = page;
                        }

                        this.pageData.next({pageSize: this.currentPageSize, currentPage: this.currentPage, lastPage: this.lastPage});

                        resolve();

                    },
                    reject
                );

        });

    }


    getBranches(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-branch-list`, {})
                .pipe(
                    map((response: any) => response.data.map((i, idx) => new Branch(i))),
                    shareReplay()
                ).subscribe((response: any) => {
                    this.onFilterBranchesChanged.next({
                        branch: response
                    });

                    resolve();
                }, reject);
            
        });
    }

  
    /**
     * Unsubscribe options
     */
    unsubscribeOptions(resetPagination: boolean = true, resetDetailData: boolean = true, resetList: boolean = true): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        this.eventsSet = false;

        // reset all variables
        this.filterBy = null;
        this.defaultPageSize = 5;
        this.defaultPageIndex = 1;

        this.message = [];

        this.filterData.next(null);

        if (resetPagination) {
            this.resetPagination();
        }
        
        // if (resetDetailData) {
        //     this.resetDetailData();
        // }

        // if (resetList) {
        //     this.resetListData();
        // }

    }

    nextPage(): void {
        this.getMessages(this.currentPage + 1);
    }

    previousPage(): void {

        const page = this.currentPage - 1;

        if (!page || page < 1) {
            return;
        }

        this.getMessages(this.currentPage - 1);

    }

    resetPagination(emit: boolean = true, resetSize: boolean = false): void {
        this.currentPage = this.defaultPageIndex;
        if (resetSize) {
            this.currentPageSize = this.defaultPageSize;
        }
        this.lastPage = true;

        if (emit) {
            this.pageData.next({pageSize: this.currentPageSize, currentPage: this.currentPage, lastPage: this.lastPage});
        }
    }

}

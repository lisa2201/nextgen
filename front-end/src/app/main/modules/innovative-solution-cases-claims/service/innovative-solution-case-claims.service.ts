import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { take, shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';

import { Branch } from '../../branch/branch.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { SortProp } from 'app/shared/interface/sort';

@Injectable()
export class InnovativeSolutionCasesClaimsService implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;

    private caseList: any [];

    caseListChanged: BehaviorSubject<any>;
    onCaseClaimsDetailChanged: BehaviorSubject<any>;
    onFilterBranchesChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onQueryByFilter: Subject<any>;
    pageData: BehaviorSubject<{currentPage: number, pageSize: number, lastPage: boolean}>;

    filterData: BehaviorSubject<any>;
    onPageSizeChanged: Subject<any>;
    
    currentPage: any;
    currentPageSize: any;
    lastPage: boolean;

    defaultPageIndex: number;
    defaultPageSize: number;
    defaultPageSizeOptions: number[] = [5, 10, 20];
    eventsSet: boolean;
    

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
        // private _branchService: BranchService,
        private _authService: AuthService
    )
    {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this.caseListChanged = new BehaviorSubject([]);
        this.onCaseClaimsDetailChanged = new BehaviorSubject({});
        this.onFilterBranchesChanged = new BehaviorSubject([]);
        
        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.onQueryByFilter = new Subject();

        this.onPageSizeChanged = new Subject();
        this._unsubscribeAll = new Subject();
        this.eventsSet = false;
        this.defaultPageIndex = 1;
        this.defaultPageSize = 10;
        this.pageData = new BehaviorSubject({currentPage: this.defaultPageIndex, lastPage: this.lastPage, pageSize: this.defaultPageSize});
        this.filterData = new BehaviorSubject(null);

        this.currentPage = this.defaultPageIndex;
        this.currentPageSize = this.defaultPageSize;
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
                this.listISCases(null)
            ])
                .then(([rooms]: [any]) => {
                    this.setEvents();
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    listISCases(page: number | null): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onTableLoaderChanged.next(true);

            const params = new HttpParams()
                .set('page', page ? page : this.currentPage)
                .set('offset', this.currentPageSize)
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-innovative-cases-claims-list`, { params })
                .pipe(
                    take(1),
                    map(response => {
                        
                        if (response.data && response.data.ListOfISInnovativeSolutionsCaseClaims && response.data.ListOfISInnovativeSolutionsCaseClaims.ISInnovativeSolutionsCaseClaim) {
                            this.caseList = response.data.ListOfISInnovativeSolutionsCaseClaims.ISInnovativeSolutionsCaseClaim;
                        } else {
                            this.caseList = null;
                        }

                        if (response.data && response.data.LastPage && response.data.LastPage === 'true') {
                            this.lastPage = true; 
                        } else {
                            this.lastPage = false; 
                        }

                        // this.isFiltered = response.filtered;

                        return {
                            items: this.caseList,
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

                        this.caseListChanged.next(response);

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

    getISCaseClaims(caseId: string): Promise<any> {

        return new Promise((resolve, reject) => {

            if (!caseId) {
                return reject('Case Claim ID not provided');
            }

            const index = _.findIndex(this.caseList, ['InnovationCaseClaimId', caseId]);
            if (index === -1) {

                const filterObj = {
                    case_id: caseId,
                };

                this.filterBy = filterObj;
               
                const params = new HttpParams()
                .set('page', this.currentPage)
                .set('offset', this.currentPageSize)
                .set('filters', JSON.stringify(this.filterBy));

                this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-innovative-cases-claims-list`, { params })
                .pipe(
                    take(1),
                    map(response => {
                        
                        if (response.data && response.data.ListOfISInnovativeSolutionsCaseClaims && response.data.ListOfISInnovativeSolutionsCaseClaims.ISInnovativeSolutionsCaseClaim) {
                            this.caseList = response.data.ListOfISInnovativeSolutionsCaseClaims.ISInnovativeSolutionsCaseClaim;
                        } else {
                            this.caseList = null;
                        }

                        if (response.data && response.data.LastPage && response.data.LastPage === 'true') {
                            this.lastPage = true; 
                        } else {
                            this.lastPage = false; 
                        }
                        this.filterBy = [];

                        return this.caseList;
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {
                        
                        this.onCaseClaimsDetailChanged.next({...this.caseList[0]});

                        resolve();

                    },
                    reject
                );
  
            } else {                
                this.onCaseClaimsDetailChanged.next({...this.caseList[index]});
                return resolve();
            }

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

        this.caseList = [];

        this.filterData.next(null);

        if (resetPagination) {
            this.resetPagination();
        }
        
        if (resetDetailData) {
            this.resetDetailData();
        }

        if (resetList) {
            this.resetListData();
        }

    }


        /**
     * set events
     */
    setEvents(): void {
        
        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
            this.filterBy = filter;
            this.filterData.next(filter);
            this.resetPagination();
            this.listISCases(null);
            });
            
        this.onPageSizeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageSize: number) => {
                this.currentPageSize = pageSize;
            });

        this.eventsSet = true;

    }

    nextPage(): void {
        this.listISCases(this.currentPage + 1);
    }

    previousPage(): void {

        const page = this.currentPage - 1;

        if (!page || page < 1) {
            return;
        }

        this.listISCases(this.currentPage - 1);

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

    resetDetailData(): void {
        this.onCaseClaimsDetailChanged.next({});
    }

    resetListData(): void {
        this.caseList = [];
        this.caseListChanged.next({
            items: [],
            lastPage: this.lastPage
        });
    }

}

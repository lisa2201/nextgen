import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
    ActivatedRouteSnapshot,
    Resolve,
    RouterStateSnapshot
} from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {shareReplay, map, takeUntil, finalize, pluck, take} from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import {CertificateOrDetermination} from '../../child/accs/certificate-or-determination.model';
import {AuthService} from '../../../../shared/service/auth.service';
import {PaginationProp} from '../../../../shared/interface/pagination';

@Injectable()
export class QueryPaymentsService {
    onCcsChanged: BehaviorSubject<any>;
    onCcsChangedCount: BehaviorSubject<any>;
    onCcsChangedfilterAfterStore: BehaviorSubject<any>;
    onCcsStatusChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    actualTotal: number;
    displayTotal: number;
    validDataCount: boolean;
    apiData: any;
    routeParams: any;
    private _unsubscribeAll: Subject<any>;

    /*filter */
    filterBy: any = '0';
    filterData: BehaviorSubject<any>;
    eventsSet: boolean;
    /*pagination*/
   /* pagination: any | null = null;
    onPaginationChanged: Subject<PaginationProp>;
    defaultPageIndex: any = 1;
    defaultPageSize: any = 5;
    defaultPageSizeOptions: number[] = [5, 10, 20];*/
    /*new pagination*/

    onQueryByFilter: Subject<any>;
    onPageSizeChanged: Subject<any>;

    currentPage: any;
    currentPageSize: any;
    lastPage: boolean;
    pageData: BehaviorSubject<{ currentPage: number, pageSize: number, lastPage: boolean }>;

    defaultPageIndex: number;
    defaultPageSize: number;
    defaultPageSizeOptions: number[] = [5, 10, 20];


    /* sharing filter data*/
    private messageSource = new BehaviorSubject('default message');
    currentMessage = this.messageSource.asObservable();

    serverErrors: any;
    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(private _httpClient: HttpClient, private _logger: NGXLogger, private _auth: AuthService) {
        // Set the defaults
        this.onCcsChanged = new BehaviorSubject([]);
        this.onCcsChangedCount = new BehaviorSubject([]);
        this.onCcsChangedfilterAfterStore = new BehaviorSubject([]);
        this.onCcsStatusChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterBy = '0';
        this._unsubscribeAll = new Subject();
        this.actualTotal = 0;
        this.displayTotal = 0;
        this.validDataCount = true;
        this.onTableLoaderChanged = new Subject();
        /* pagination */
        // this.onPaginationChanged = new Subject();
        /* new pagination */
        this.defaultPageIndex = 1;
        this.defaultPageSize = 5;
        this.onPageSizeChanged = new Subject();
        this.currentPage = this.defaultPageIndex;
        this.currentPageSize = this.defaultPageSize;
        this.onQueryByFilter = new Subject();

        /*filter */
        this.filterData = new BehaviorSubject(null);
        this.eventsSet = false;

        this.serverErrors = null;

        this.pageData = new BehaviorSubject({ currentPage: this.defaultPageIndex, lastPage: this.lastPage, pageSize: this.defaultPageSize });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    changeMessage(message: any): void {
        this.messageSource.next(message);
    }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {
        return this.getServices();
        /*this.routeParams = route.params;
        return new Promise((resolve, reject) => {
            Promise.all([
                this.getServices()
            ])
                .then(([certificateOrDetermination]: [any]) => {
                    this.onCcsChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((res: any) => {
                            this.getServices();
                            // return this.emergency;
                        });
                    resolve();
                    return this.getServices();
                })
                .catch(error => {
                    reject(error);
                });
        });*/
    }
    getServices(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-list-service-setup`)
            .pipe(
                map(response => response.data)
            );

    }
    /*resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        this.routeParams = route.params;
        return new Promise((resolve, reject) => {
            Promise.all([
                this.getQuery(this.routeParams.id)
            ])
                .then(([certificateOrDetermination]: [any]) => {
                    this.onFilterChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((res: any) => {
                            this.getQuery('');
                            // return this.emergency;
                        });
                    this.onPaginationChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(pagination => {

                            this.pagination = pagination;
                            this.onChangeQuery(pagination);
                        });
                    resolve();
                    return this.apiData;
                })
                .catch(error => {
                    reject(error);
                });
        });
    }*/
    getQuery(page: number | null): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onTableLoaderChanged.next(true);
            // this.branchDetails = this._auth.getClient();
            const postData =  {
                filters: JSON.stringify(this.filterBy),
                // branch: this.branchDetails.id,
                page: page ? page : this.currentPage,
                offset: this.currentPageSize
            }
            const params = new HttpParams()
                .set('page', page ? page : this.currentPage)
                .set('offset', this.currentPageSize)
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/query-payments`, postData )
                .pipe(
                    take(1),
                    map(response => {

                        if (response.ApiData && response.ApiData.ListOfPayments && response.ApiData.ListOfPayments.Payment) {
                            this.apiData = response.ApiData.ListOfPayments.Payment;
                        } else {
                            this.apiData = [];
                        }

                        if (response.ApiData && response.ApiData.LastPage && response.ApiData.LastPage === 'true') {
                            this.lastPage = true;
                        } else {
                            this.lastPage = false;
                        }

                        if (response.ApiData.ReturnError)
                        {
                            this.serverErrors = response.ApiData.ReturnMessage;
                        }
                        else {
                            this.serverErrors = null;
                        }

                        // this.isFiltered = response.filtered;

                        return {
                            item: [...this.apiData],
                            lastPage: this.lastPage,
                            serverErrors: this.serverErrors
                        };
                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onCcsChanged.next(response);

                        if (page) {
                            this.currentPage = page;
                        }

                        this.pageData.next({ pageSize: this.currentPageSize, currentPage: this.currentPage, lastPage: this.lastPage });

                        resolve();

                    },
                    reject
                );

        });

    }


    setEvents(): void {

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;
                this.filterData.next(filter);
                this.resetPagination();
                this.getQuery(null);
            });

        this.onPageSizeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageSize: number) => {
                this.currentPageSize = pageSize;
            });

        this.eventsSet = true;

    }


    nextPage(): void {
        this.getQuery(this.currentPage + 1);
    }

    previousPage(): void {

        const page = this.currentPage - 1;

        if (!page || page < 1) {
            return;
        }

        this.getQuery(this.currentPage - 1);

    }

    resetPagination(emit: boolean = true, resetSize: boolean = false): void {
        this.currentPage = this.defaultPageIndex;
        this.lastPage = true;

        if (resetSize) {
            this.currentPageSize = this.defaultPageSize;
        }

        if (emit) {
            this.pageData.next({ pageSize: this.currentPageSize, currentPage: this.currentPage, lastPage: this.lastPage });
        }
    }

    /*onChangeQuery(pagination: any): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.getQuery(pagination)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((response: any) =>
                {
                    this.onCcsChanged.next(response);
                    resolve();
                }, reject);
        });
    }*/


    /**
     * Get branch list
     *
     * @returns {Promise<any>}
     */
     /*getCcsDatas(): Promise<any> {
         
        this.onTableLoaderChanged.next(true);

        const params = new HttpParams().set(
            'filters',
            JSON.stringify(this.filterBy)
        );
        return new Promise((resolve, reject) => {
            this._httpClient
                .get<any>(
                    `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/query-remittance`,
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
                    this.apiData = response.data.map(i => new CertificateOrDetermination(i));
                    this.displayTotal = response.displayCount;
                    this.actualTotal = response.actualCount;
                    this.validDataCount = response.validDataCount;
                    // this.onCcsChanged.next({ccsList:[...this.ccslist],});
                    this.onCcsChanged.next([...this.apiData]);
                    this.onCcsChangedCount.next(this.validDataCount);
                    // this.onCcsChangedfilterAfterStore.next(true);
                    resolve();
                }, reject);
        });
    }*/

    /*getPaginationOptions(): any {
        return this.pagination;
    }

    getQuery(sendData: any): Observable<any>{
        this.onTableLoaderChanged.next(true);
        /!*pagination*!/
        if (_.isNull(this.pagination))
        {
            this.pagination = {
                page: this.defaultPageIndex,
                size: this.defaultPageSize
            };
        }

        this.branchDetails = this._auth.getClient();
        const params = new HttpParams()
            .set('filters', sendData)
            .set('branch', this.branchDetails.id)
            .set('page', this.pagination.page)
            .set('offset', this.pagination.size);
        const postData =  {
            filters: sendData,
            branch: this.branchDetails.id,
            page: this.pagination.page,
            offset: this.pagination.size
        }
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/query-remittance`,  postData )
            .pipe(
                map(response => {
                    this.apiData = response.ApiData;
                    // this.ApiData = response.ApiData;
                    this.onCcsChanged.next(response.ApiData);
                    this.onFilterChanged.next(response.ApiData);
                    return {
                        item: this.apiData,
                    };
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

        // return
    }*/


    changeServiceCredentials(data: object): Observable<any>{

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/service-credentials`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }
}

import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Organization } from '../Models/organization.model';
import { shareReplay, map, finalize, takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { SortProp } from 'app/shared/interface/sort';
import { User } from '../../user/user.model';

@Injectable()
export class OrganizationService 
{
    private _unsubscribeAll: Subject<any>;

    private organizations: Organization[];

    onOrganizationChanged: BehaviorSubject<any>;
    onPaginationChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onFilterChanged: Subject<any>;
    onDateFilterChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;

    onOrgTabViewLoaderChanged: Subject<number>;

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

    /**
    * Constructor
    * 
    * @param {HttpClient} _httpClient
    * @param {NGXLogger} _logger
    */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger
    ) {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this.onOrganizationChanged = new BehaviorSubject([]);

        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.onDateFilterChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();

        this.onOrgTabViewLoaderChanged = new Subject();

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
        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this.getOrganizations(),
            ])
            .then(([organizations]: [any]) => 
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
    setEvents(): void 
    {
        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => 
            {
                this.searchText = searchText;

                this.getOrganizations();
            });

        this.onSortChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(sort => 
                {
                this.sortBy = sort;

                this.getOrganizations();
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

                this.getOrganizations();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => 
            {
                this.pagination = pagination;

                this.getOrganizations();
            });

    }

    /**
     * get organization list
     *
     * @returns {Promise<any>}
     */
    getOrganizations(): Promise<any> 
    {
        return new Promise((resolve, reject) => 
        {
            // set table loader
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
                .set('filters', JSON.stringify(this.filterBy))
                ;

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-org-list`, { params })
                .pipe(
                    map(response => 
                    {
                        this.organizations = response.data.map((i: any, idx: number) => new Organization(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.organizations],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        };
                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => 
                    {
                        this.onOrganizationChanged.next(response);

                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * Get dependency
     */
    getDependency(): Observable<any> {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-org-list`, {})
            .pipe(
                map(response => {

                    return {
                        //   organizations: response.data.organizations.map(new Organization()),
                        //    branches: response.data.branches.map(i => new Branch(i)),
                        //    levels: response.data.rolelevels
                        organizations: response.data.map(i => new Organization(i)),
                    };

                }),
                shareReplay()
            );
    }

    /**
     * Email Exists
     * @param {string} email 
     * @param {string} index 
     */
    emailExists(email: string, index: string = ''): Observable<any> {
        const params = new HttpParams()
            .set('id', index)
            .set('value', email);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/org-email-check`, { params })
            .pipe(
                map(response => response.data.found),
                shareReplay()
            );
    }

    /**
     * Create new subscriber
     * @param {object} data 
     */
    storeOrganization(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create_subscriber`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * Edit Organization
     * @param {string} index 
     */
    getOrganization(index: string): Observable<any> {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/edit-org`, { params })
            .pipe(
                map(response => new Organization(response.data)),
                shareReplay()
            );
    }

    /**
     * Delete Organization
     * @param {string} index 
     */
    deleteOrganization(index: string): Observable<any> {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-org`, { params })
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * Approve Subscriber
     * @param {object} data 
     */
    approveOrganization(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/approve-email`, data)
            .pipe(
                map(response => response.message),
                shareReplay()

            );

    }

    /**
     * Delete Multiple subscribers
     * @param {Object} data 
     */
    multiDelete(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-org-multi`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
        * Get Organization Info
        * @param {string} id 
        */
    getOrganizationInfo(id: string): Observable<any> {
        const params = new HttpParams().set('id', id);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/org-info`, { params })
            .pipe(
                map(response => new Organization(response.data)),
                shareReplay()
            );
    }

    /**
     * Get Organization Info
     * @param {string} id 
     */
    getOrg(id: string): Observable<any> {
        const params = new HttpParams().set('id', id);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/org-info`, { params })
            .pipe(
                map(response => response),
                shareReplay()
            );
    }

    /**
     * Reset Declarations
     */
    resetDeclarations(): void 
    {
        this.organizations = [];

        this.pagination = null;
        this.filterBy = null;
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
    }

    /**
     * Unsubscribe Options
     */
    unsubscribeOptions(): void 
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        // clear values
        this.resetDeclarations();
    }

    /**
     * Update Organization
     * @param {object} data 
     */
    updateOrganization(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-org`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        const item = new Organization(response.data);
                        const index = this.organizations.findIndex((val) => val.id === item.id);
                        this.organizations[index] = item;

                        setTimeout(() => this.onOrganizationChanged.next({
                            items: [...this.organizations],
                            total: this.totalDisplayRecords
                        }), 100);
                    }

                    return response.message;

                }),
                shareReplay()
            );
    }

    editQuotation(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/edit_quotation`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        const item = new Organization(response.data);
                        const index = this.organizations.findIndex((val) => val.id === item.id);
                        this.organizations[index] = item;

                        setTimeout(() => this.onOrganizationChanged.next({
                            items: [...this.organizations],
                            total: this.totalDisplayRecords
                        }), 100);
                    }

                    return response.message;

                }),
                shareReplay()
            );
    }

    /**
     * Approve Subscriber
     * @param {object} data 
     */
    approveOrganizationCustom(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/approve-custom-email`, data)
            .pipe(
                map(response => response.message),
                shareReplay()

            );

    }

    /**
       * Create new subscriber
       * @param {object} data 
       */
    createQuotation(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create_subscriber`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
        * Get Organization Info
        * @param {string} id 
        */
    getQuotationInfo(id: string): Observable<any> {

        const params = new HttpParams().set('id', id);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/quote-info`, { params })
            .pipe(
                map(response => response),
                shareReplay()
            );
    }

    /**
     * get subscriber linked branches
     *
     * @param {string} org
     * @returns {Observable<any>}
     */
    getSubscriberBranchAccess(orgId: string, userId: string): Observable<any>
    {
        const params = new HttpParams()
            .set('org', orgId)
            .set('user', userId);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-org-branch-access`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new User(i, idx))),
                shareReplay()
            );
    }

    /**
     * update subscriber branch access
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    updateSubscriberBranchAccess(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-org-branch-access`, data)
            .pipe(
                map(response => 
                {
                    return {
                        message: response.message,
                        added: response.data
                    }
                }),
                shareReplay()
            );
    }

}

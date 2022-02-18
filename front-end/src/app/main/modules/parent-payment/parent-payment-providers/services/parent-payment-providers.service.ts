import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { AppConst } from 'app/shared/AppConst';
import { ParentPaymentProvider } from '../parent-payment-provider.model';
import { finalize, map, shareReplay, takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { Branch } from 'app/main/modules/branch/branch.model';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { SortProp } from 'app/shared/interface/sort';

@Injectable()
export class ParentPaymentProvidersService {

    private _unsubscribeAll: Subject<any>;

    private paymentProviders: ParentPaymentProvider[];
    onPaymentProvidersChanged: BehaviorSubject<any>;
    providerFull: boolean;

    onDefaultFilterChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

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
    defaultFilter: any = {
        status: 'all'
    };

    constructor(private _httpClient: HttpClient) {
        this.paymentProviders = [];
        this.onPaymentProvidersChanged = new BehaviorSubject([]);
        this.providerFull = false;
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;
        this.onDefaultFilterChanged = new BehaviorSubject({...this.defaultFilter});

        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterBy = {...this.defaultFilter};

        this._unsubscribeAll = new Subject();
    }

    listParentPaymentAccounts(): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
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


            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-providers-list`, { params })
                .pipe(
                    map(response => {
                        
                        this.paymentProviders = _.map(response.data, (item: any, index: number) => new ParentPaymentProvider(item, index));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;
                        this.providerFull = response.providerFull === true ? true : false;


                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.paymentProviders],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered,
                            providerFull: this.providerFull
                        };

                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response) => {
                        
                        this.onPaymentProvidersChanged.next(response);

                        resolve(null);
                    },
                    reject
                );

        });

    }

    getOrganizationInfo(): Observable<any> {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-org`)
            .pipe(
                map(response => new Organization(response.data)),
                shareReplay()
            );
    }

    getBranchList(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-payment-provider-branch-list`)
            .pipe(
                map((response) => {
                    return response.data.map((val: any, idx: number) => new Branch(val, idx));
                })
            );

    }

    addProvider(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-provider-store`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    updateProvider(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-provider-update`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    deleteProvider(postData: any, index: number): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-provider-delete`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    validateKeys(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-provider-key-validate`, postData)
            .pipe(
                shareReplay()
            );

    }

    setEvents(): void {

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => {
                this.searchText = searchText;
                this.listParentPaymentAccounts();
            });

        this.onSortChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(sort => {
                this.sortBy = sort;
                this.listParentPaymentAccounts();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination)) {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.listParentPaymentAccounts();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;
                this.listParentPaymentAccounts();
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
        this.filterBy = {...this.defaultFilter};
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
        this.paymentProviders = [];
    }

}

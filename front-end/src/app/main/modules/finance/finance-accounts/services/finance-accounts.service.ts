import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { take, map, finalize, shareReplay, takeUntil } from 'rxjs/operators';
import { FinanceAccount } from '../finance-account.model';
import { FinancePaymentPlan } from '../finance-payment-plan.model';
import { SortProp } from 'app/shared/interface/sort';
import { FinanceParentExclusion } from '../finance-payment-settings/finance-parent-exclusions-settings/finance-parent-exclusion.model';

@Injectable()
export class FinanceAccountsService {

    private _unsubscribeAll: Subject<any>;

    private financeAccounts: FinanceAccount[];
    private financePaymentPlans: FinancePaymentPlan[];
    private financeParentExclusions: FinanceParentExclusion[];

    onFinanceAccountsChanged: BehaviorSubject<any>;
    onFinancePaymentPlanChanged: BehaviorSubject<any>;
    onFinanceParentExclusionsChanged: BehaviorSubject<any>;
    onDefaultFilterChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onExclusionLoaderChanged: Subject<any>;

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
        payment_schedule: 'all',
        payment_method: 'all',
        account_balance_equality: null,
        account_balance_value: null,
        last_payment_date_equality: null,
        last_payment_date: null,
        next_payment_date_equality: null,
        next_payment_date: null,
        primary_payer: 'yes',
        parent_status: '0',
        payment_frequency: null,
        billing_term: null,
        payment_day: null,
        auto_charge: true
    };

    /**
     * constructor
     * @param {HttpClient} _httpClient 
     */
    constructor(
        private _httpClient: HttpClient,
    ) {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this.onFinanceAccountsChanged = new BehaviorSubject([]);
        this.onFinancePaymentPlanChanged = new BehaviorSubject([]);
        this.onFinanceParentExclusionsChanged = new BehaviorSubject([]);
        this.onDefaultFilterChanged = new BehaviorSubject({...this.defaultFilter});

        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onExclusionLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterBy = {...this.defaultFilter};

        this._unsubscribeAll = new Subject();
    }


    listFinanceAccounts(): Promise<any> {

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

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-accounts-list`, { params })
                .pipe(
                    take(1),
                    map(response => {

                        this.financeAccounts = response.data.map((i: any, idx: number) => new FinanceAccount(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.financeAccounts],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered,
                            hasEzidebit: response.hasEzidebit ? true : false
                        };
                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onFinanceAccountsChanged.next(response);

                        resolve(null);

                    },
                    reject
                );

        });

    }
    
    addPaymentPlan(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-payment-plan`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    editPaymentPlan(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-payment-plan-update`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    emailEzidebitLink(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-mail-ezidebit-link`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    bulkeEmailEzidebitLink(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-bulk-mail-ezidebit-link`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    deletePaymentPlan(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-payment-plan-delete`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    listPaymentPlans(parentId: string): Promise<any> {

        const params = new HttpParams().set('user_id', parentId);

        this.onTableLoaderChanged.next(true);

        return new Promise((resolve, reject) => {
            
            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-payment-plans`, {params})
                .pipe(
                    take(1),
                    map((response) => {
                        return response.data;
                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response) => {
                    this.financePaymentPlans = response.map((i: any, idx: number) => new FinancePaymentPlan(i, idx));
                    this.onFinancePaymentPlanChanged.next(_.isEmpty(response) ? [] : [...this.financePaymentPlans]);
                    resolve(null);
                    },
                    reject
                );

        });


    }

    listParentFinanceExlusions(parentId: string): Promise<any> {

        const params = new HttpParams().set('user_id', parentId);

        this.onExclusionLoaderChanged.next(true);

        return new Promise((resolve, reject) => {
            
            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-finance-exclusion-list`, {params})
                .pipe(
                    take(1),
                    map((response) => {
                        return response.data;
                    }),
                    finalize(() => {
                        setTimeout(() => this.onExclusionLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response) => {
                    this.financeParentExclusions = response.map((i: any, idx: number) => new FinanceParentExclusion(i, idx));
                    this.onFinanceParentExclusionsChanged.next(_.isEmpty(response) ? [] : [...this.financeParentExclusions]);
                    resolve(null);
                    },
                    reject
                );

        });


    }

    addParentFinanceExclusion(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-finance-exclusion-store`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    deleteParentFinanceExclusion(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-finance-exclusion-delete`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    recalculateBalance(): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/recalculate-booking-transactions`, {})
            .pipe(
                map((response) => {
                    return response.message;
                })
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
                this.listFinanceAccounts();
            });

        this.onSortChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(sort => {
                this.sortBy = sort;
                this.listFinanceAccounts();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination)) {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.listFinanceAccounts();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;
                this.listFinanceAccounts();
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
        this.financeAccounts = [];
    }

    clearPaymentSettingPage(): void {
        this.financePaymentPlans = [];
        this.financeParentExclusions = [];
    }

}

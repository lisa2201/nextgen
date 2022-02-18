import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';
import { take, map, finalize, shareReplay, takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { User } from 'app/main/modules/user/user.model';
import { FinancialStatement } from '../financial-statements.model';
import { SortProp } from 'app/shared/interface/sort';

@Injectable()
export class FinancialStatementsService {

    private _unsubscribeAll: Subject<any>;
    private _unsubscribeAddPage: Subject<any>;

    private financialStatements: FinancialStatement[];

    onFinancialStatementsChanged: BehaviorSubject<any>;
    onFilterParentChanged: BehaviorSubject<any>;
    onDefaultFilterChanged: BehaviorSubject<any>;
    onUserDefaultFilterChanged: BehaviorSubject<any>;
    onUsersChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onUserFilterLoading: Subject<any>;
    onUserFilterChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 25;
    defaultPageSizeOptions: number[] = [25, 50, 75, 100];

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    userFilterBy: any |null = null;
    sortBy: any | null = null;
    searchText: string | null = null;
    defaultFilter: any = {
        start_date: null,
        end_date: null,
        invoice_date: null,
        type: '0',
        parent: null,
        parent_status: '0'
    };

    defaultUserFilter: any = {
        payment_schedule: 'all',
        primary_payer: true,
        parent_status: '0',
        payment_frequency: null,
        billing_term: null,
        payment_day: null,
        auto_charge: true
    };

    constructor(
        private _httpClient: HttpClient,
    ) {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this.onFinancialStatementsChanged = new BehaviorSubject([]);
        this.onFilterParentChanged = new BehaviorSubject([]);
        this.onDefaultFilterChanged = new BehaviorSubject({...this.defaultFilter});
        this.onUserDefaultFilterChanged = new BehaviorSubject({...this.defaultUserFilter});
        this.onUsersChanged = new BehaviorSubject([]);

        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onUserFilterLoading = new Subject();
        this.onFilterChanged = new Subject();
        this.onUserFilterChanged = new Subject();
        this.filterBy = {...this.defaultFilter};
        this.userFilterBy = {...this.defaultUserFilter};

        this._unsubscribeAll = new Subject();
        this._unsubscribeAddPage = new Subject();
    }


    listFinancialStatements(): Promise<any> {

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

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-statements`, { params })
                .pipe(
                    take(1),
                    map(response => {

                        this.financialStatements = response.data.map((i: any, idx: number) => new FinancialStatement(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.financialStatements],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        };
                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onFinancialStatementsChanged.next(response);

                        resolve(null);

                    },
                    reject
                );

        });

    }
    
    getParentList(): Observable<any> {

        const params = new HttpParams()
            .set('filters', JSON.stringify(this.userFilterBy));

        this.onUserFilterLoading.next(true);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-statements-get-parents`, { params })
            .pipe(
                map((response) => {

                    const users = _.map(response.data, (i: any, idx: number) => new User(i, idx));

                    this.onUsersChanged.next([...users]);

                    return users;

                }),
                finalize(() => {
                    setTimeout(() => this.onUserFilterLoading.next(false), 300);
                }),
            );

    }

    setEvents(): void {

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => {
                this.searchText = searchText;
                this.listFinancialStatements();
            });

        this.onSortChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(sort => {
                this.sortBy = sort;
                this.listFinancialStatements();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination)) {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.listFinancialStatements();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;
                this.listFinancialStatements();
            });

    }

    addStatementPageSetEvents(): void {

        this.onUserFilterChanged
        .pipe(takeUntil(this._unsubscribeAddPage))
        .subscribe(filter => {
            this.userFilterBy = filter;
            this.getParentList().subscribe();
        });

    }

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
        this.financialStatements = [];
    }

    addPageUnsubscribeOptions(): void {

        this._unsubscribeAddPage.next();
        this._unsubscribeAddPage.complete();

        // reinitialize 
        this._unsubscribeAddPage = new Subject();
        this.userFilterBy = {...this.defaultUserFilter};

    }
    
}

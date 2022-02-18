import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { FinanceAccountTransaction } from '../finance-account-transaction.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { take, map, finalize, shareReplay, takeUntil } from 'rxjs/operators';
import { SortProp } from 'app/shared/interface/sort';
import { Child } from 'app/main/modules/child/child.model';
import { User } from 'app/main/modules/user/user.model';

@Injectable()
export class FinanceAccountTransactionService {

    private _unsubscribeAll: Subject<any>;

    private financeAccountTransactions: FinanceAccountTransaction[];

    onFinanceAccounTransactionsChanged: BehaviorSubject<any>;
    onFilterChildrenChanged: BehaviorSubject<Child[]>;
    onFilterParentChanged: BehaviorSubject<User[]>;
    onDefaultFilterChanged: BehaviorSubject<any>;

    onFilterByParent: Subject<any>;
    onFilterShowReversed: Subject<any>;

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
        type: '0',
        date: null,
        category: '0',
        parent: null,
        child: null,
        reversed: false,
        parent_status: '0'
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

        this.onFinanceAccounTransactionsChanged = new BehaviorSubject([]);
        this.onFilterChildrenChanged = new BehaviorSubject([]);
        this.onFilterParentChanged = new BehaviorSubject([]);
        this.onFilterByParent = new BehaviorSubject(false);
        this.onFilterShowReversed = new BehaviorSubject(false);
        this.onDefaultFilterChanged = new BehaviorSubject({...this.defaultFilter});

        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterBy = {...this.defaultFilter};

        this._unsubscribeAll = new Subject();
    }


    listFinanceAccounTransactions(): Promise<any> {

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

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-account-transactions`, { params })
                .pipe(
                    take(1),
                    map(response => {

                        this.financeAccountTransactions = response.data.map((i: any, idx: number) => new FinanceAccountTransaction(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.financeAccountTransactions],
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

                        this.onFinanceAccounTransactionsChanged.next(response);

                        resolve(null);

                    },
                    reject
                );

        });

    }

    /**
     * set events
     */
    setEvents(): void {

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => {
                this.searchText = searchText;
                this.listFinanceAccounTransactions();
            });

        this.onSortChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(sort => {
                this.sortBy = sort;
                this.listFinanceAccounTransactions();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination)) {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.listFinanceAccounTransactions();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;
                this.listFinanceAccounTransactions();
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
        this.financeAccountTransactions = [];
    }

}

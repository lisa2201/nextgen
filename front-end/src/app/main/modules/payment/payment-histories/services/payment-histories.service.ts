import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { takeUntil, take, map, finalize, shareReplay } from 'rxjs/operators';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { PaymentHistory } from '../payment-history.model';
import { SortProp } from 'app/shared/interface/sort';

@Injectable()
export class PaymentHistoriesService {

    private _unsubscribeAll: Subject<any>;

    private paymentHistories: PaymentHistory[];

    onPaymentHistoryChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

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

    constructor(
        private _httpClient: HttpClient,
    ) {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this.onPaymentHistoryChanged = new BehaviorSubject([]);

        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();

        this._unsubscribeAll = new Subject();
    }


    listPaymentHistories(): Promise<any> {

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

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/payment-histories`, { params })
                .pipe(
                    take(1),
                    map(response => {

                        this.paymentHistories = response.data.map((i: any, idx: number) => new PaymentHistory(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.paymentHistories],
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

                        this.onPaymentHistoryChanged.next(response);

                        resolve();

                    },
                    reject
                );

        });

    }

    setEvents(): void {

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => {
                this.searchText = searchText;
                this.listPaymentHistories();
            });

        this.onSortChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(sort => {
                this.sortBy = sort;
                this.listPaymentHistories();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination)) {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.listPaymentHistories();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;
                this.listPaymentHistories();
            });

    }

    unsubscribeOptions(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        // reset all variables
        this.pagination = null;
        this.filterBy = null;
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
    }


}

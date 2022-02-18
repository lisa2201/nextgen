import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';
import { take, map, finalize, shareReplay, takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { CCSPayments } from '../financial-ccs-payments.model';

@Injectable()
export class FinancialCcsPaymentsService {

    private _unsubscribeAll: Subject<any>;

    private ccsPayments: CCSPayments;

    onCcsPaymentsChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<any>;
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


    /**
     * constructor
     * @param {HttpClient} _httpClient 
     */
    constructor(
        private _httpClient: HttpClient,
    ) {
        // Set the defaults

        this.onCcsPaymentsChanged = new BehaviorSubject([]);
        this.onFilterChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.filterBy = null;
        this._unsubscribeAll = new Subject();

        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

    }


    listCcsPayments(): Promise<any> {

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
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-ccs-payments-list`, { params })
                .pipe(
                    take(1),
                    map(response => {

                        this.ccsPayments = response.data;
                        this.totalDisplayRecords = this.ccsPayments.results ? this.ccsPayments.results.length : 0;
                        this.totalRecords = this.ccsPayments.count;

                        return {
                            items: this.ccsPayments,
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords
                        };

                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onCcsPaymentsChanged.next(response);

                        resolve();

                    },
                    reject
                );

        });

    }

    downloadCsv(data: any): Observable<any> {

        const params = new HttpParams()
                .set('filters', JSON.stringify(data));

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/ccs-payments-csv`, { params })
            .pipe(
                take(1),
                map(response => {
                    return response.data;
                }),
                shareReplay()
            );
            
    }

    setEvents(): void {

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;

                // // reset page index
                // if (!_.isNull(this.pagination)) {
                //     this.pagination.page = this.defaultPageIndex;
                // }

                this.listCcsPayments();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;
                this.listCcsPayments();
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
        this.ccsPayments = null;
        this.filterBy = null;

        this.pagination = null;
        this.filterBy = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
    }
}

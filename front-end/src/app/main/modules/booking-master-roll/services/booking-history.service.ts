import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, Subject, forkJoin } from 'rxjs';
import { first, map, shareReplay, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { NotificationService } from 'app/shared/service/notification.service';

import { Fee } from '../../centre-settings/fees/model/fee.model';
import { Child } from '../../child/child.model';
import { Room } from '../../room/models/room.model';
import { AppConst } from 'app/shared/AppConst';
import { Booking } from '../../child/booking/booking.model';
import { browserRefresh } from 'app/app.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { PaginationProp } from 'app/shared/interface/pagination';

@Injectable()
export class BookingHistoryService
{
    private _unsubscribeAll: Subject<any>;

    private bookings: Booking[];
    private children: Child[];
    private rooms: Room[];
    private fees: Fee[];

    onBookingHistoryChanged: BehaviorSubject<any>;
    onChildrenChanged: BehaviorSubject<any>;
    onRoomsChanged: BehaviorSubject<any>;
    onFeeChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 5;
    defaultPageSizeOptions: number[] = [5, 10, 20];

    paginationMeta: any;
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
     * @param {Router} _router
     * @param {NotificationService} _notificationService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _notificationService: NotificationService
    )
    {
        // Set the defaults
        this.onBookingHistoryChanged = new BehaviorSubject([]);
        this.onChildrenChanged = new BehaviorSubject([]);
        this.onRoomsChanged = new BehaviorSubject([]);
        this.onFeeChanged = new BehaviorSubject([]);

        this.onPaginationChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();

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
            forkJoin([
                this.getDependency().toPromise(),
                this.getBookingHistory()
            ])
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    ([dependencies, bookings]) =>
                    {
                        this.setEvents(dependencies);

                        resolve(null);
                    },
                    errorResponse =>
                    {
                        if (browserRefresh && state.url !== '')
                        {
                            if (errorResponse && errorResponse.error)
                            {
                                this._notificationService.displaySnackBar(errorResponse.error.message, NotifyType.ERROR);
                            }

                            this._router.navigate([_.head(_.filter(state.url.split('/'), _.size))]);
                        }

                        reject(errorResponse);
                    }
                );
        });
    }

    /**
     * set events after resolve
     */
    setEvents(dependencies: { children: Child[], fees: Fee[], rooms: Room[] } = null): void
    {
        if (!_.isEmpty(dependencies))
        {
            this.children = dependencies.children; 
            this.onChildrenChanged.next([...this.children]);

            this.rooms = dependencies.rooms;
            this.onRoomsChanged.next([...this.rooms]);

            this.fees = dependencies.fees;
            this.onFeeChanged.next([...this.fees]);
        }

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText =>
            {
                this.searchText = searchText;

                this.getBookingHistory();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;

                this.getBookingHistory();
            });
    }

    /**
     * get booking history dependency
     */
    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/booking-history-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1 || (response.data.children.length < 1 || response.data.rooms.length < 1 || response.data.fees.length < 1))
                    {
                        return {};
                    }
                    else
                    {
                        return {
                            children: response.data.children.map((i: any, idx: number) => new Child(i, idx)),
                            rooms: response.data.rooms.map((i: any, idx: number) => new Room(i, idx)),
                            fees: response.data.fees.map((i: any, idx: number) => new Fee(i, idx))
                        };

                    }
                }),
                shareReplay()
            );
    }

    /**
     * get booking history
     *
     * @returns {Promise<any>}
     */
    getBookingHistory(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            // set view loader
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
                // .set('sort', JSON.stringify(this.sortBy))
                .set('filters', JSON.stringify(this.filterBy));
            
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-booking-history`, { params })
                .pipe(
                    map(response => 
                    {
                        this.bookings = (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? response.data.map((i: any, idx: number) => new Booking(i, idx)) : [];

                        this.paginationMeta = response.meta || null;
                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            meta: this.paginationMeta,
                            items:  [...this.bookings],
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
                        this.onBookingHistoryChanged.next(response);

                        resolve(response);
                    },
                    reject
                );
        });
    }
    
    /**
     * Unsubscribe options
     */
    unsubscribeOptions(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        // reset all variables
        this.sortBy = null;
        this.searchText = null;
        this.paginationMeta = null;
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }
}

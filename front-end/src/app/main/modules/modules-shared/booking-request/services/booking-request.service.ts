import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { AppConst } from 'app/shared/AppConst';
import { BookingRequest } from 'app/main/modules/child/booking-request/booking-request.model';
import { isNull } from 'util';

@Injectable()
export class BookingRequestService
{
    private _unsubscribeAll: Subject<any>;

    private bookingRequests: BookingRequest[];
    private rooms: Room[];
    private children: Child[];
    private fees: Fee[];

    onBookingRequestsChanged: BehaviorSubject<any>;
    onDependencyChanged: BehaviorSubject<any>;

    onCalendarDateChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    triggerBookingRequestViewCall: Subject<any>;

    dateParams: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;

    /**
     * Constructor
     * 
     * @param {HttpClient} _httpClient
     */
    constructor(
        private _httpClient: HttpClient
    )
    {
        // Set the defaults
        this.onBookingRequestsChanged = new BehaviorSubject([]);
        this.onDependencyChanged = new BehaviorSubject([]);

        this.onCalendarDateChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();

        this.triggerBookingRequestViewCall = new Subject();

        this._unsubscribeAll = new Subject();

        this.setEvents();
    }

    /**
     * set events after resolve
     */
    setEvents(): void
    {
        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => this.filterBy = filter);
    }

    /**
     * get booking requests
     *
     * @returns {Promise<any>}
     */
    getBookingRequest(isFiltered: boolean = false, ignoreDependency: boolean = false): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            // set view loader
            this.onViewLoaderChanged.next(true);

            let params = new HttpParams();

            if (isFiltered)
            {
                params = params.set('filters', JSON.stringify(this.filterBy));
            }
                
            if (ignoreDependency)
            {
                params = params.set('ignore_depends', _.toString(ignoreDependency));
            } 
                
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-booking-requests`, { params })
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    map(response => 
                    {
                        if (response.data.dependencies)
                        {
                            this.onDependencyChanged.next({
                                children: response.data.dependencies.children.map((i: any, idx: number) => new Child(i, idx)),
                                fees: response.data.dependencies.fees.map((i: any, idx: number) => new Fee(i, idx)),
                                rooms: response.data.dependencies.rooms.map((i: any, idx: number) => new Room(i, idx))
                            })
                        }

                        return response.data.requests.map((i: any, idx: number) => new BookingRequest(i, idx));
                    }),
                    finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.bookingRequests = response;

                        this.onBookingRequestsChanged.next({
                            list: this.bookingRequests,
                            isFiltered: isFiltered
                        });

                        resolve(this.bookingRequests);
                    },
                    reject
                );
        });
    }

    /**
     * verify booking request
     * 
     * @returns {Observable<any>}
     */
    verifyBookingRequest(id: string): Observable<any>
    {
        const params = new HttpParams().set('id', id);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/verify-booking-request`, { params })
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        return {
                            request: new BookingRequest(response.data.request),
                            preview: response.data.preview,
                            error_type: response.data.error_type,
                            abs_reason: response.data.abs_reason
                        }
                    }
                    else
                    {
                        return {};
                    }
                }),
                shareReplay()
            );
    }

    /**
     * booking request action
     * 
     * @returns {Observable<any>}
     */
    bookingRequestAction(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/booking-request-action`, data)
            .pipe(
                map(response =>
                {
                    this.triggerBookingRequestViewCall.next(true);

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * clear service variables
     */
    resetVariables(): void
    {

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

        //
        this.bookingRequests = [];
        this.children = [];
        this.rooms = [];
        this.fees = [];

        // reset all variables
        this.resetVariables();
    }
}
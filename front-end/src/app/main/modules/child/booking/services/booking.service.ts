import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { browserRefresh } from 'app/app.component';

import { ChildrenService } from '../../services/children.service';

import { Child } from '../../child.model';
import { AppConst } from 'app/shared/AppConst';
import { Booking } from '../booking.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { BookingSessionType } from 'app/shared/enum/booking-session-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Room } from 'app/main/modules/room/models/room.model';

@Injectable()
export class ChildBookingService
{
    private _unsubscribeAll: Subject<any>;

    private bookings: Booking[];
    private child: Child;

    onChildChanged: BehaviorSubject<any>;
    onChildBookingChanged: BehaviorSubject<any>;
    onFilterFeeChanged: BehaviorSubject<any>;
    onFilterRoomChanged: BehaviorSubject<any>;
    onFilterAbsenceReasonChanged: BehaviorSubject<any>;

    onCalendarDateChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onUpdateCalendarDateChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    disableBookingActions: Subject<any>;

    routeParams: any;

    dateParams: any | null = null;
    filterBy: any | null = null;

    calenderSettings = {
        hideWeekEnd: true
    };

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildrenService} _childrenService
     * @param {NotificationService} _notificationService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _childrenService: ChildrenService,
        private _notificationService: NotificationService
    )
    {
        // Set the defaults
        this.onChildChanged = new BehaviorSubject([]);
        this.onChildBookingChanged = new BehaviorSubject([]);
        this.onFilterFeeChanged = new BehaviorSubject([]);
        this.onFilterRoomChanged = new BehaviorSubject([]);
        this.onFilterAbsenceReasonChanged = new BehaviorSubject([]);

        this.onCalendarDateChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onUpdateCalendarDateChanged = new Subject();
        this.onFilterChanged = new Subject();

        this.disableBookingActions = new Subject();

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
        this.routeParams = route.params;

        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this.getChild(this.routeParams.id),
                this.getBookings(this.routeParams.id),
                this.getDependency(BookingSessionType.BOTH, true).toPromise()
            ])
            .then(([child, bookings, dependencies]: [any, any, any]) => 
            {
                this.setEvents(dependencies);

                resolve(null);
            })
            .catch(errorResponse => 
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
            });
        });
    }

    /**
     * set events after resolve
     */
    setEvents(dependencies: any = null): void
    {
        if (!_.isEmpty(dependencies))
        {
            this.onFilterFeeChanged.next(dependencies.fees);

            this.onFilterRoomChanged.next(dependencies.rooms);

            this.onFilterAbsenceReasonChanged.next(dependencies.abs_reason);
        }

        this.onCalendarDateChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this.dateParams = {
                    start: value.start,
                    end: value.end
                };

                this.getBookings(this.child.id);
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;

                this.getBookings(this.child.id);
            });
    }

    /**
     * get bookings
     *
     * @returns {Promise<any>}
     */
    getBookings(child: string): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            // set view loader
            this.onViewLoaderChanged.next(true);

            const params = new HttpParams()
                .set('id', child)
                .set('start', this.dateParams ? this.dateParams.start : null)
                .set('end', this.dateParams ? this.dateParams.end : null)
                .set('filters', JSON.stringify(this.filterBy));
            
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-booking-list`, { params })
                .pipe(
                    map(response => response.data),
                    finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.bookings = response.map((i: any, idx: number) => new Booking(i, idx));

                        this.onChildBookingChanged.next([...this.bookings]);

                        resolve(this.bookings);
                    },
                    reject
                );
        });
    }

    /**
     * Get week bookings by child
     *
     * @param {string} child
     * @param {{ start: string, end: string }} date
     * @memberof ChildBookingService
     */
    getWeekBookingsByChild(child: string, date: { start: string, end: string }): void
    {
        this.dateParams = {
            start: date.start,
            end: date.end
        };

        this.getBookings(child);
    }

    /**
     * Get child item
     * 
     * @returns {Promise<any>}
     */
    getChild(index: string): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._childrenService
                .getChild(index)
                .pipe(first())
                .subscribe(
                    (response) =>
                    {
                        this.child = response;

                        this.onChildChanged.next(this.child);
                        
                        resolve(this.child);
                    },
                    reject
                );
        });
    }

    /**
     * get booking dependency
     *
     * @param {string} type
     * @param {*} [getAbsReason=false]
     * @param {string} [id=null]
     * @returns {Observable<any>}
     * @memberof ChildBookingService
     */
    getDependency(type: string, getAbsReason: any = false, id: string = null): Observable<any>
    {        
        let params = new HttpParams()
            .set('type', type);

        if (getAbsReason)
        {
            params = params.set('abs_reason', getAbsReason);
        }

        if(!_.isNull(id))
        {
            params = params.set('ref', id);
        }

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/booking-data`, { params })
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1 || (response.data.fees.length < 1))
                    {
                        return {};
                    }
                    else
                    {
                        const object = {
                            fees: response.data.fees.map((i: any, idx: number) => new Fee(i, idx)),
                            rooms: response.data.rooms.map((i: any, idx: number) => new Room(i, idx))
                        };

                        if (getAbsReason)
                        {
                            object['abs_reason'] = response.data.abs_reason || [];
                        }

                        return object;
                    }
                }),
                shareReplay()
            );
    }

    /**
     * get ccs absence reasons
     * 
     * @returns {Observable<any>}
     */
    getAbsenceReasons(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-abs-reasons`, {})
            .pipe(
                map(response => response.data),
                shareReplay()
            );
    }

    /**
     * get preview booking time slots
     * 
     * @returns {Observable<any>}
     */
    getPreviewSlots(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-booking-preview`, data)
            .pipe(
                map(response => response.data),
                shareReplay()
            );
    }

    /**
     * get update preview booking slots
     * 
     * @returns {Observable<any>}
     */
    getUpdatePreviewSlots(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/manage-bookings-preview`, data)
            .pipe(
                map(response => response.data),
                shareReplay()
            );
    }
        
    /**
     * Create new booking
     * 
     * @returns {Observable<any>}
     */
    storeBooking(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-booking`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * Create single booking
     * 
     * @returns {Observable<any>}
     */
    storeSingleBooking(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-single-booking`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new Booking(response.data);
                        item.isNew = true;

                        if(this.bookings)
                        {
                            this.bookings = this.bookings.concat(item).map((v, i) =>
                            {
                                v.index = i;
                                return v;
                            });
                        }

                        return {
                            message: response.message,
                            item: item
                        };
                    }
                    else
                    {
                        return { message: response.message };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * Get booking item
     * 
     * @returns {Observable<any>}
     */
    getBooking(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-booking-info`, { params })
            .pipe(
                map(response => new Booking(response.data)),
                shareReplay()
            );
    }

    /**
     * Manage bookings (update/delete)
     * 
     * @returns {Observable<any>}
     */
    manageBooking(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/manage-bookings`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * Update a booking
     * 
     * @returns {Observable<any>}
     */
    updateSingleBooking(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-single-booking`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new Booking(response.data);
                        item.isNew = true;

                        if(this.bookings)
                        {
                            const index = this.bookings.findIndex((val) => val.id === item.id);
                            item.index = this.bookings[index].index;

                            this.bookings[index] = item;
                        }

                        return {
                            message: response.message,
                            item: item
                        };
                    }
                    else
                    {
                        return { message: response.message };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * Delete a booking
     * 
     * @returns {Observable<any>}
     */
    deleteBooking(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-booking`, { params })
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * update single booking type
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateBookingType(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-booking-type`, data)
            .pipe(
                map(response => 
                {
                    return {
                        message: response.message,
                        item: new Booking(response.data)
                    };
                }),
                shareReplay()
            );
    }

    /**
     * get booking for bulk attendance update
     *
     * @param {{ reference: any, start: string, end: string }} data
     * @returns {Observable<any>}
     */
    getBulkAttendancePreview(data: { reference: any, start: string, end: string }): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-bookings-bulk-attendance`, data)
            .pipe(
                map(response => response.data.map((i: any, idx: number) => 
                { 
                    const item = new Booking(i, idx);

                    item.isNew = _.isNull(item.attendance);

                    if(!item.isNew && !_.isNull(item.attendance))
                    {
                        item.holdAttendanceStartTime = item.attendance.checkInTime;

                        item.holdAttendanceTime = [
                            item.attendance.checkInTime,
                            null
                        ];
                    }

                    return item;
                })),
                shareReplay()
            );
    }

    /**
     * update bulk attendance
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateBulkAttendance(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-bulk-attendance`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * get booking fees
     *
     * @param {string} branchId
     * @param {string} [date=null]
     * @param {string} [sDate=null]
     * @param {string} [eDate=null]
     * @returns {Observable<any>}
     */
    getBookingFees(branchId: string, date:string = null, sDate: string = null, eDate: string = null): Observable<any>
    {
        const params = new HttpParams()
            .set('branch', branchId)
            .set('current', date ? date : DateTimeHelper.now().format(AppConst.dateTimeFormats.dateOnly))
            .set('start', sDate ? sDate : DateTimeHelper.thisWeek().start.format(AppConst.dateTimeFormats.dateOnly))
            .set('end', eDate ? eDate : DateTimeHelper.thisWeek().end.format(AppConst.dateTimeFormats.dateOnly))

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/widget-get-booking-fees`, { params })
            .pipe(
                map(response => response.data),
                shareReplay()
            );
    }

    /**
     * get bookings time sheet
     *
     * @param {*} rooms
     * @param {string} [date=null]
     * @returns {Observable<any>}
     */
    getBookingsForTimeSheet(rooms: any, date: string = null): Observable<any>
    {
        const params = new HttpParams()
            .set('rooms', JSON.stringify(rooms))
            .set('date', date ? date : DateTimeHelper.now().format(AppConst.dateTimeFormats.dateOnly));

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-booking-time-sheet`, { params })
            .pipe(
                map(response => response.data.map((i, idx) => new Booking(i, idx))),
                shareReplay()
            );
    }

    /**
     * get child history
     *
     * @param {any} reference
     * @returns {Observable<any>}
     */
    getBookingHistory(reference: any): Observable<any>
    {
        const params = new HttpParams()
            .set('ref', JSON.stringify(reference));

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-booking-history`, { params })
            .pipe(
                map(response => 
                {
                    if (Object.keys(response.data).length > 0)
                    {
                        const formattedList = [];

                        for(const key in response.data)
                        {
                            formattedList.push({
                                group: key,
                                bookings: _.sortBy(response.data[key], 'date').map((i, idx) => new Booking(i, idx))
                            });
                        }

                        return formattedList;
                    }
                    else
                    {
                        return [];
                    }
                }),
                shareReplay()
            );
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
        this.bookings = [];
        
        this.dateParams = null;
        this.filterBy = null;

        //
        this.onChildChanged.next([]);
        this.onChildBookingChanged.next([]);
        this.onFilterFeeChanged.next([]);
        this.onFilterRoomChanged.next([]);
        this.onFilterAbsenceReasonChanged.next([]);
    }
}

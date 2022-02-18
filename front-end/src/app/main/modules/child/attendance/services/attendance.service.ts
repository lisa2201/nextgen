import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { browserRefresh } from 'app/app.component';

import { ChildrenService } from '../../services/children.service';

import { Attendance } from '../attendance.model';
import { Child } from '../../child.model';
import { AppConst } from 'app/shared/AppConst';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Booking } from '../../booking/booking.model';


@Injectable()
export class ChildAttendanceService
{
    private _unsubscribeAll: Subject<any>;

    private attendance: Attendance[];
    private child: Child;

    onChildChanged: BehaviorSubject<any>;
    onChildAttendanceChanged: BehaviorSubject<any>;

    onCalendarDateChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onShowBookingDetailView: Subject<any>;

    routeParams: any;

    dateParams: any | null = null;
    filterBy: any | null = null;

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
        this.onChildAttendanceChanged = new BehaviorSubject([]);

        this.onCalendarDateChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onShowBookingDetailView = new Subject();

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
                this.getAttendance(this.routeParams.id)
            ])
            .then(([child, attendance]: [any, any]) => 
            {
                this.setEvents();

                resolve();
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
    setEvents(): void
    {
        this.onCalendarDateChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this.dateParams = {
                    start: value.start,
                    end: value.end
                };

                this.getAttendance(this.child.id);
            });

        // this.onFilterChanged
        //     .pipe(takeUntil(this._unsubscribeAll))
        //     .subscribe(filter =>
        //     {
        //         this.filterBy = filter;

        //         this.getBookings(this.child.id);
        //     });
    }

    /**
     * get weekly attendance
     *
     * @param {string} child
     * @returns {Promise<any>}
     */
    getAttendance(child: string): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            // set view loader
            this.onViewLoaderChanged.next(true);

            const params = new HttpParams()
                .set('id', child)
                .set('start', this.dateParams ? this.dateParams.start : null)
                .set('end', this.dateParams ? this.dateParams.end : null);
            
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-attendance-list`, { params })
                .pipe(
                    map(response => response.data),
                    finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.attendance = response
                            .map((i: any, idx: number) => new Booking(i, idx))
                            .map((i: any, idx: number) =>
                            {
                                i.index = idx;
                                return i;
                            });
                        
                        this.onChildAttendanceChanged.next([...this.attendance]);

                        resolve();
                    },
                    reject
                );
        });
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
                        
                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * get attendance by children
     *
     * @param {{ children: Child[], start: string, end: string }} data
     * @returns {Observable<any>}
     */
    getAttendanceByChildren(data: { children: string[], start: string, end: string }): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/attendance-by-children`, data)
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Attendance(i, idx))),
                shareReplay()
            )
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
        this.attendance = [];
        
        this.dateParams = null;
        this.filterBy = null;
    }
}

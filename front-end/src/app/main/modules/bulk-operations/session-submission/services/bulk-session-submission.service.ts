import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';

import { NotificationService } from 'app/shared/service/notification.service';

import { browserRefresh } from 'app/app.component';
import { AppConst } from 'app/shared/AppConst';
import { Child } from 'app/main/modules/child/child.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { SessionSubmission } from 'app/main/modules/child/session-submission/session-submission.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';

@Injectable()
export class BulkSessionSubmissionService
{
    private _unsubscribeAll: Subject<any>;

    private children: Child[];

    onDependChanged: BehaviorSubject<any>;
    onSessionChanged: BehaviorSubject<{ sessionList: Array<any>, dependActions: Array<any>, dependChangeReason: Array<any> }>;
    onSubmissionsChanged: BehaviorSubject<any>;

    onSessionListChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onCalendarWeekChanged: Subject<any>;
    resetTabListChange: Subject<any>;

    onBookingUpdated: Subject<any>;
    onSubmissionUpdated: Subject<any>;
    onResetListView: Subject<any>;

    onSummeryViewWeekSelected: Subject<any>;

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
        private _notificationService: NotificationService
    )
    {
        // Set the defaults
        this.onDependChanged = new BehaviorSubject([]);
        this.onSessionChanged = new BehaviorSubject({ sessionList: [], dependActions: [], dependChangeReason: [] });
        this.onSubmissionsChanged = new BehaviorSubject([]);

        this.onSessionListChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onCalendarWeekChanged = new Subject();
        this.resetTabListChange = new Subject();

        this.onBookingUpdated = new Subject();
        this.onSubmissionUpdated = new Subject();
        this.onResetListView = new Subject();

        this.onSummeryViewWeekSelected = new Subject();

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
            Promise.all([
                this.getDependency().toPromise()
            ])
            .then(([dependencies]: [any]) =>
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
            this.children = dependencies.children;

            this.onDependChanged.next({ children: this.children });
        }
    }

    /**
     * get manage session submissions dependency
     *
     * @returns {Observable<any>}
     */
    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/session-submissions-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1 || (response.data.children.length < 1))
                    {
                        return {};
                    }
                    else
                    {
                        const object = {
                            children: response.data.children.map((i: any, idx: number) => new Child(i, idx)),
                        };

                        return object;
                    }
                }),
                shareReplay()
            );
    }

    /**
     * get sessions list
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    getSessions(data: any): Observable<any>
    {
        // set view loader
        this.onViewLoaderChanged.next(true);

        const params = new HttpParams()
            .set('child', data.child)
            .set('start', data.start)
            .set('end', data.end);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-session-submissions-list`, { params })
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        const _list: Array<any> = [];

                        for (const item of response.data.list)
                        {
                            if (_.keys(item).length < 1) continue;

                            _list.push({
                                id: uuid.v4(),
                                child: (item.child) ? new Child(item.child) : null,
                                bookings: (item.bookings) ? item.bookings.map((i: any, idx: number) => new Booking(i, idx)) : [],
                                enrolment_id: item.enrolment_id || null,
                                enrolment_ref: item.enrolment_ref || null,
                                enrolment_session_type: item.enrolment_session_type || null,
                                pre_school_status: item.pre_school_status || '',
                                is_no_care: item.is_no_care || false,
                                enrolment_routine: item.enrolment_routine || [],
                                selected: item.selected || [],
                                has_error: false,
                                has_update: false,
                                form_values: {
                                    action: null,
                                    change_reason: null,
                                    reason_late_change: null,
                                    reason_no_change: null
                                }
                            });
                        }

                        return {
                            list: _list,
                            submitted: response.data.submissions.map((i: any, idx: number) => new SessionSubmission(i, idx)),
                            reason_for_change: response.data.reason_for_change,
                            actions: response.data.actions,
                        };
                    }
                }),
                finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    /**
     * submit bulk sessions
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    bulkSessionSubmission(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/bulk-session-submission`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * get session summary report - month
     *
     * @param {any} data
     * @returns {Observable<any>}
     */
    getSessionSummaryReport(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-session-summary-report`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        for (const week of response.data.list)
                        {
                            for (const item of week.items)
                            {
                                if (_.keys(item).length < 1) continue;

                                item.child = (item.child) ? new Child(item.child) : null;
                                item.bookings = (item.bookings) ? item.bookings.map((i: any, idx: number) => new Booking(i, idx)) : [];
                                item.is_no_care = item.is_no_care || false;

                                item['id'] = uuid.v4();
                            }

                            week.submissions = week.submissions.map((i: any, idx: number) => new SessionSubmission(i, idx))
                        }

                        return {
                            list: response.data.list,
                            reason_for_change: response.data.reason_for_change,
                            actions: response.data.actions,
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * clear tab view data
     *
     */
    clearTabData(): void
    {
        this.onSessionChanged = new BehaviorSubject({ sessionList: [], dependActions: [], dependChangeReason: [] });

        this.onSubmissionsChanged = new BehaviorSubject([]);
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
        this.children = [];

        this.onDependChanged.next([]);
        this.onSessionChanged.next({ sessionList: [], dependActions: [], dependChangeReason: [] });
        this.onSubmissionsChanged.next([]);
    }
}

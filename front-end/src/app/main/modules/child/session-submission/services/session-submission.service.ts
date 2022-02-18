import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as uuid from 'uuid';

import { NGXLogger } from 'ngx-logger';

import { browserRefresh } from 'app/app.component';

import { ChildrenService } from '../../services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Child } from '../../child.model';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { SessionSubmission } from '../session-submission.model';
import { Booking } from '../../booking/booking.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Injectable()
export class ChildSessionSubmissionService
{
    private _unsubscribeAll: Subject<any>;

    private sessions: SessionSubmission[];
    private child: Child;

    routeParams: any;

    onChildChanged: BehaviorSubject<any>;
    onChildSessionSubmissionChanged: BehaviorSubject<any>;

    onCurrentSessionChanged: Subject<any>;
    onListViewItemChanged: Subject<any>;
    onListViewItemUpdated: Subject<any>;
    onDetailViewItemUpdated: Subject<any>;

    onDetailActionLoaderChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
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

    currentSession: SessionSubmission;

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
        this.onChildSessionSubmissionChanged = new BehaviorSubject([]);

        this.onDetailActionLoaderChanged = new Subject();
        this.onCurrentSessionChanged = new Subject();
        this.onListViewItemChanged = new Subject();
        this.onListViewItemUpdated = new Subject();
        this.onDetailViewItemUpdated = new Subject();

        this.onViewLoaderChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onPaginationChanged = new Subject();
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
        this.routeParams = route.params;

        return new Promise((resolve, reject) =>
        {
            Promise.all([
                this.getChild(this.routeParams.id),
                this.getSessions(this.routeParams.id)
            ])
            .then(([child, sessions]: [any, any]) => 
            {
                this.setEvents();

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
    setEvents(): void
    {
        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText =>
            {
                this.searchText = searchText;

                this.getSessions(this.child.id);
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination =>
            {
                this.pagination = pagination;
                
                this.getSessions(this.child.id);
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination))
                {
                    this.pagination.page = this.defaultPageIndex;
                }

                this.resetCurrentSession();

                this.getSessions(this.child.id);
            });
    }

    /**
     * get session list
     *
     * @param {string} child
     * @returns {Promise<any>}
     */
    getSessions(child: string): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            // set table loader
            this.onViewLoaderChanged.next(true);

            if (_.isNull(this.pagination))
            {
                // set default value
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            }

            const params = new HttpParams()
                .set('id', child)
                .set('page', this.pagination.page)
                .set('offset', this.pagination.size)
                .set('search', this.searchText)
                .set('sort', JSON.stringify(this.sortBy))
                .set('filters', JSON.stringify(this.filterBy));
            
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-session-submission-list`, { params })
                .pipe(
                    map(response =>
                    {
                        this.sessions = response.data.map((i: any, idx: number) => new SessionSubmission(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            meta: response.meta || null,
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.sessions],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        };
                    }),
                    finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.onChildSessionSubmissionChanged.next(response);

                        resolve(response);
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
                        
                        resolve(null);
                    },
                    reject
                );
        });
    }

    /**
     * get session submission dependency
     *
     * @returns {Observable<any>}
     */
    getDependency(): Observable<any>
    {
        const params = new HttpParams()
            .set('id', this.child.id);
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/session-submission-data`, { params })
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        return {
                            enrolment_reference: response.data.enrolment_reference,
                            enrolment_id: response.data.enrolment_id,
                            enrolment_routine: response.data.enrolment_routine,
                            reason_for_change: response.data.reason_for_change,
                            actions: response.data.actions,
                        }; 
                    }
                }),
                shareReplay()
            );
    }

    /**
     * get session submission details
     *
     * @returns {Observable<any>}
     */
    getSessionInformation(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-session-details`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    
                    return {
                        bookings: response.data.bookings.map((i: any, idx: number) => new Booking(i, idx)),
                        pre_school_status: response.data.pre_school_status,
                        selected: response.data.selected,
                        is_no_care: response.data.is_no_care
                    };
                    
                }),
                shareReplay()
            );
    }

    /**
     * save session report
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    storeSessionReport(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-session-submission`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getSessions(this.routeParams.id);

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * withdraw session report
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    withdrawSessionReport(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/withdraw-session-report`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        return {
                            item: new SessionSubmission(response.data),
                            message: response.message
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
     * get withdrawal reasons
     *
     * @returns {Observable<any>}
     */
    getWithdrawalDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-withdrawal-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        return {
                            withdrawal_reason: response.data.withdrawal_reason,
                        }; 
                    }
                }),
                shareReplay()
            );
    }

    /**
     * read session report
     *
     * @param {string} id
     * @returns {Observable<any>}
     */
    readSessionReport(id: string): Observable<any>
    {
        const params = new HttpParams()
            .set('index', id);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/read-session-submission`, { params })
            .pipe(
                map(response => new SessionSubmission(response.data)),
                shareReplay()
            );
    }

    /**
     * Delete a session submission
     *
     * @param {string} index
     * @returns {Observable<any>}
     */
    deleteSession(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-session-submission`, { params })
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getSessions(this.routeParams.id);
                    
                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * get previews for resubmit session
     * 
     * @returns {Observable<any>}
     */
    getResubmitPreview(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/preview-resubmit-session`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    
                    return {
                        enrolment_routine: response.data.enrolment_routine,
                        bookings: response.data.bookings.map((i: any, idx: number) => new Booking(i, idx)),
                        pre_school_status: response.data.pre_school_status,
                        selected: response.data.selected,
                        is_no_care: response.data.is_no_care
                    };
                    
                }),
                shareReplay()
            );
    }

    /**
     * resubmit session report
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    resubmitSessionReport(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/resubmit-session`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getSessions(this.routeParams.id);

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * get session submission summary for widget
     *
     * @param {string} [sDate=null]
     * @param {string} [eDate=null]
     * @returns {Observable<any>}
     */
    getSessionSubmissionSummary(branchId: string, sDate: string = null, eDate: string = null): Observable<any>
    {
        const params = new HttpParams()
            .set('branch', branchId)
            .set('start', sDate ? sDate : DateTimeHelper.thisWeek().start.format(AppConst.dateTimeFormats.dateOnly))
            .set('end', eDate ? eDate : DateTimeHelper.thisWeek().end.format(AppConst.dateTimeFormats.dateOnly))

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/widget-get-session-submission-summary`, { params })
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
                                actions: response.data.actions
                            };
                        }
                    }
                ),
                shareReplay()
            );
    }

    /**
     * update session list
     *
     * @param {SessionSubmission[]} list
     */
    updateSessionsList(list: SessionSubmission[]): void
    {
        this.sessions = [...list];
    }
         
    /**
     * Set current session by id
     *
     * @param {string} id
     */
    setCurrentSession(id: string): void
    {
        this.currentSession = this.sessions.find(s => s.id === id);

        this.onCurrentSessionChanged.next(this.currentSession);
    }

    /**
     * clear selected current session
     */
    resetCurrentSession(): void
    {
        this.currentSession = null;

        this.onCurrentSessionChanged.next(this.currentSession);
    }

    /**
     * check if service holds session list
     *
     * @returns {boolean}
     */
    hasSessions(): boolean
    {
        return this.sessions && this.sessions.length > 0;
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
        this.sessions = [];
        
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;

        this.currentSession = null;

        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }
}

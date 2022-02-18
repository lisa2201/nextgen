import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import * as _ from 'lodash';

import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Branch } from '../../branch/branch.model';

@Injectable()
export class DashboardService
{
    branches: Branch[];

    onDashboardLoad: BehaviorSubject<any>;
    onDashboardBranchLoaded: BehaviorSubject<any>;
    onTableLoaderChanged: any;
    onBranchChange: Subject<any>;

    constructor(
        private _httpClient: HttpClient,
        private _authService: AuthService
    ) {
        this.onDashboardLoad = new BehaviorSubject([]);
        this.onDashboardBranchLoaded = new BehaviorSubject([]);
        this.onBranchChange = new Subject<any>();
    }

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
            if (this._authService.isOwnerPath())
            {
                Promise.all([
                    this.getBranchList().toPromise()
                ])
                .then(([branches]: [any]) =>
                {
                    resolve();
                })
                .catch(error =>
                {
                    reject(error);
                });
            }
            else
            {
                resolve();
            }
        });
    }

    /**
     * Get Branch List
     *
     * @returns {Observable<any>}
     */
    getBranchList(): Observable<any>
    {
        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-dashboard-branch-list`
            )
            .pipe(
                map(response =>
                {
                    this.branches = response.data.map((i: any, idx: any) => new Branch(i, idx));

                    this.onDashboardBranchLoaded.next(this.branches)
                }),
                shareReplay()
            );
    }

    /**
     * Update waitlist summary
     *
     * @returns {Observable<any>}
     */
    getWaitlist(branchId: string = '', sDate: string = null, eDate: string = null): Observable<any> {
        let params = new HttpParams();
        params = params.set('branch_id', branchId)
            .set('start', sDate ? sDate : DateTimeHelper.thisWeek().start.format(AppConst.dateTimeFormats.dateOnly))
            .set('end', eDate ? eDate : DateTimeHelper.thisWeek().end.format(AppConst.dateTimeFormats.dateOnly))

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-waitlist-dashboard-summary`,
                {params}
            )
            .pipe(
                map((response) => {
                    return response;
                }),
                shareReplay()
            );
    }


    /**
     * Get CCS Notifications
     *
     * @returns {Observable<any>}
     */
    getCCSNotification(branchId: string = ''): Observable<any> {
        let params = new HttpParams();
        params = params.set('branch_id', branchId)
            .set('date', this._authService.getClient() ? DateTimeHelper.now().tz(this._authService.getClient().timeZone).format(AppConst.dateTimeFormats.dateOnly): DateTimeHelper.now().format(AppConst.dateTimeFormats.dateOnly))
            .set('weekStart',DateTimeHelper.thisWeek().start.format(AppConst.dateTimeFormats.dateOnly))
            .set('weekEnd',DateTimeHelper.thisWeek().end.format(AppConst.dateTimeFormats.dateOnly));

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-ccs-notification-dashboard`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response;
                }),
                shareReplay()
            );
    }


    /**
     * Get CCS Notifications
     *
     * @returns {Observable<any>}
     */
    getCenterWiseRatio(branchId: string = ''): Observable<any> {
        let params = new HttpParams();
        params = params.set('branch_id', branchId).set('date', this._authService.getClient() ? DateTimeHelper.now().tz(this._authService.getClient().timeZone).format(AppConst.dateTimeFormats.dateOnly): DateTimeHelper.now().format(AppConst.dateTimeFormats.dateOnly));

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-center-wise-ratio-dashboard`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response;
                }),
                shareReplay()
            );
    }

    /**
     * Update booking summary
     *
     * @returns {Observable<any>}
     */
    getBookingSummary(branchId: string = '', startDate: string, day: string = ''): Observable<any> {
        let params = new HttpParams();
        params = params
            .set('branch_id', branchId)
            .set('day', day)
            .set('start_date', startDate);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-dashboard-booking-info`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    getParentPayments(branchId: string = '', startDate: string = null, endDate: string = null, date: string = null): Observable<any> {
        let params = new HttpParams();
        params = params
            .set('branch_id', branchId)
            .set('current', date ? date : DateTimeHelper.now().format(AppConst.dateTimeFormats.dateOnly))
            .set('start', startDate ? startDate : DateTimeHelper.thisWeek().start.format(AppConst.dateTimeFormats.dateOnly))
            .set('end', endDate ? endDate : DateTimeHelper.thisWeek().end.format(AppConst.dateTimeFormats.dateOnly));

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-parent-payment-dashboard-summary`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    getPaymentOverdue(branchId: string = '', filter: string = ''): Observable<any> {
        let params = new HttpParams();
        params = params
            .set('branch_id', branchId)
            .set('filter', filter ? filter : 'month');

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-parent-payment-overdue-dashboard-summary`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    /**
     * Update live ratio
     *
     * @returns {Observable<any>}
     */
    getLiveRatio(branchId: string = ''): Observable<any> {
        let params = new HttpParams();
        params = params.set('branch_id', branchId);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-dashboard-live-ratio`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    /**
     * Update attendance summary
     *
     * @returns {Observable<any>}
     */
    getAttendance(branchId: string = '', date: string = '', room: string = ''): Observable<any> {
        let params = new HttpParams();
        params = params.set('branch_id', branchId)
            .set('date', date)
            .set('room', room);

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-dashboard-attendance-summary`,
                { params }
            )
            .pipe(
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );
    }

    /**
     * Get User assigned rooms
     *
     * @returns {Observable<any>}
     */
    getUserRooms(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-user-room-list`)
            .pipe(
                map((response) => {
                    return response;
                }),
                shareReplay()
            );
    }
}

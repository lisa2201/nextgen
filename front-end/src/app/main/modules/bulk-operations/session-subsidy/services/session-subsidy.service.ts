import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';
import { take, map, finalize, shareReplay, takeUntil } from 'rxjs/operators';
import { Subsidy } from '../session-subsidy.model';
import { Child } from 'app/main/modules/child/child.model';
import * as _ from 'lodash';

@Injectable()
export class SessionSubsidyService {

    private _unsubscribeAll: Subject<any>;

    private sessionSubsidies: Subsidy[];

    onSubsidyChanged: BehaviorSubject<any>;

    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    filterBy: any | null = null;

    constructor(
        private _httpClient: HttpClient,
    ) {
        // Set the defaults

        this.onSubsidyChanged = new BehaviorSubject([]);
        this.onFilterChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.filterBy = null;
        this._unsubscribeAll = new Subject();
    }


    listCcsEntitlements(): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onTableLoaderChanged.next(true);

            const params = new HttpParams()
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/session-subsidy-list`, { params })
                .pipe(
                    take(1),
                    map(response => {

                        return response.data ? response.data : [];
                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onSubsidyChanged.next(response);

                        resolve(null);

                    },
                    reject
                );

        });

    }

    getDependency(): Observable<any> {
        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/session-subsidy-dependancy`)
            .pipe(
                take(1),
                map(response => {

                    const children = response.data ? _.map(response.data, (val, ind: number) => new Child(val, ind)) : [];

                    return children;
                }),
                shareReplay()
            );
    }

    downloadCsv(data: any): Observable<any> {

        const params = new HttpParams()
                .set('filters', JSON.stringify(data));

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/session-subsidy-csv`, { params })
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

                this.listCcsEntitlements();
            });

        // this.onPaginationChanged
        //     .pipe(takeUntil(this._unsubscribeAll))
        //     .subscribe(pagination => {
        //         this.pagination = pagination;
        //         this.listBalanceAdjustments();
        //     });

    }

    getReasonMap(): any {

        const reasonMap = {
            ABREAS: 'Absence Reason',
            ABSENC: 'Absence Over 42 Days',
            ABSEND: 'Absence Prior To Enrolment Cease Date',
            ABSFIR: 'Absence Prior To 1st Physical Attendance',
            ACEXHT: 'Annual Cap Exhausted',
            APTEXH: 'Apportioned Hours Exhausted',
            ATREXH: 'Activity Test Results Exhausted',
            CESENR: 'Enrolment Ceased',
            CUSDBT: 'Reversal Of Customer Debt',
            'CUST%0': `Customer's CCS Subsidy % is 0`,
            DBTTRF: 'Debt Transfer',
            DISENR: 'Disputed Enrolment',
            FDCCHS: 'FDC Child Swapping',
            IHCFEE: 'More Than One Session Fee',
            INVSER: 'Service Is Invalid',
            INVWWC: 'Invalid WWC card',
            LCLEMR: 'Local Emergency',
            MANENR: 'Manual Enrolment',
            NOATR: 'No Activity Test Result',
            NOCARE: 'No Care Indicator in Session Report',
            NOCWB: 'No CWB Certificate or Application',
            NOENR: 'No Active Enrolment',
            NOENT: 'No Entitlement Exists',
            PELENR: 'Enrolment Pending Eligibility (Claim)',
            PENENR: 'Enrolment Pending Confirmation',
            PRELIG: 'Provider Not Eligible',
            PRODBT: 'Reversal Of Extra Payment To Provider',
            PROSUS: 'Provider Suspended',
            PSTRCO: 'Differences to Customer, Post Reco Processing',
            RECENR: 'Enrolment Received (CRN Pending)',
            REJENR: 'Enrolment Rejected',
            REPLAC: 'Session Report Replaced',
            SERCAN: 'Service Is Cancelled',
            SERSUS: 'Service Suspended',
            'SESS0$': `Session Of Care Amt is $0`,
            SVELIG: 'Service Not Eligible',
            TRANSP: 'Transport only checked in Session Of care',
            WITHDR: 'Session Report Withdrawn',
            WTHAPP: 'Withholding Applied'
        };

        return reasonMap;
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
        this.sessionSubsidies = [];
        this.filterBy = null;
    }

}

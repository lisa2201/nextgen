import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {shareReplay, map, takeUntil, finalize, pluck, take} from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import {AuthService} from '../../../shared/service/auth.service';
import {EntitlementReport} from './entitlement-report.model';
import {NotifyType} from '../../../shared/enum/notify-type.enum';
import {CsvService} from '../../../shared/service/csv.service';
import {NotificationService} from '../../../shared/service/notification.service';
import { Child } from '../child/child.model';

@Injectable({
    providedIn: 'root'
})
export class EntitlementCcsService {
    onCcsChanged: BehaviorSubject<any>;
    onCcsChangedCount: BehaviorSubject<any>;
    onCcsChangedfilterAfterStore: BehaviorSubject<any>;
    onCcsStatusChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    onPaginationChanged: Subject<any>;
    totalRecords: number;
    validDataCount: boolean;
    branchDetails: any;
    apiData: any;
    routeParams: any;
    private _unsubscribeAll: Subject<any>;

    /*filter */
    filterBy: any = '0';
    filterData: BehaviorSubject<any>;
    eventsSet: boolean;

    onPageSizeChanged: Subject<any>;

    currentPage: any;
    currentPageSize: any;
    lastPage: boolean;
    pageData: BehaviorSubject<{ currentPage: number, pageSize: number, lastPage: boolean }>;

    pagination: any | null = null;

    defaultPageIndex: number;
    defaultPageSize: number;
    defaultPageSizeOptions: number[] = [5, 10, 20];

    serverErrors: any;

    /* sharing filter data*/
    private messageSource = new BehaviorSubject('default message');
    currentMessage = this.messageSource.asObservable();

    /* reports  */
    field:any = [];
    report: EntitlementReport[];
    reportData: any;
    onFilterChangedReport: Subject<any>;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param _auth
     * @param _csvService
     * @param _notification
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _auth: AuthService,
        private _csvService: CsvService,
        private _notification: NotificationService,
        ) {
        // Set the defaults
        this.onCcsChanged = new BehaviorSubject([]);
        this.onCcsChangedCount = new BehaviorSubject([]);
        this.onCcsChangedfilterAfterStore = new BehaviorSubject([]);
        this.onCcsStatusChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterBy = '0';
        this._unsubscribeAll = new Subject();
        this.validDataCount = true;
        this.onTableLoaderChanged = new Subject();
        this.onPaginationChanged = new Subject();
        /* pagination */
        // this.onPaginationChanged = new Subject();
        /* new pagination */
        this.defaultPageIndex = 1;
        this.defaultPageSize = 5;
        this.onPageSizeChanged = new Subject();
        this.currentPage = this.defaultPageIndex;
        this.currentPageSize = this.defaultPageSize;

        /*filter */
        this.filterData = new BehaviorSubject(null);
        this.eventsSet = false;

        this.serverErrors = null;

        this.pageData = new BehaviorSubject({ currentPage: this.defaultPageIndex, lastPage: this.lastPage, pageSize: this.defaultPageSize });

        /*reports*/
        this.reportData = [
            {
                index: 0,
                name: 'Enrolment ID',
                res: 'enrolmentID'
            },
            {
                index: 1,
                name: 'Child Name',
                res: 'childName'
            },
            {
                index: 2,
                name: 'Date Of Entitlement',
                res: 'dateOfEntitlement'
            },
            {
                index: 3,
                name: 'CCS Percentage',
                res: 'CCSPercentage'
            },

            {
                index: 4,
                name: 'CCS Withholding Percentage',
                res: 'CCSWithholdingPercentage'
            },
            {
                index: 5,
                name: 'CCS Total Hours Per Fortnight',
                res: 'CCSTotalHoursPerFortnight'
            },
            {
                index: 5,
                name: 'Apportioned Hours Per Fortnight',
                res: 'apportionedHoursPerFortnight'
            },
            {
                index: 2,
                name: 'ACCS Hourly Rate Cap Increase Percentage',
                res: 'ACCSHourlyRateCapIncreasePercentage'
            },
            {
                index: 3,
                name: 'Annual Cap Reached',
                res: 'annualCapReached'
            },

            {
                index: 4,
                name: 'Absence Count',
                res: 'absenceCount'
            },
            {
                index: 5,
                name: 'Preschool Exemption',
                res: 'preschoolExemption'
            },
        ];
        this.onFilterChangedReport = new Subject()
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    changeMessage(message: any): void {
        this.messageSource.next(message);
    }

    getQuery(page: number | null): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onTableLoaderChanged.next(true);

            const postData =  {
                filters: JSON.stringify(this.filterBy)
            }

            this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-entitlement`, postData )
                .pipe(
                    take(1),
                    map(response => {

                        this.apiData = response?.data || [];

                        return {
                            item: [...this.apiData]
                        };
                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onCcsChanged.next(response);

                        this.currentPage = this.defaultPageIndex;

                        resolve(response);

                    },
                    reject
                );

        });

    }

    getCsv(filterData: any): void {

        this.filterBy = filterData;

        this.getQuery(null).then((response) => {

            const csvdata = response.item || [];

            const masterRows = [];
        
            _.forEach(csvdata, (record) => {

                const rows = {
                    'Enrolment ID' : record.enrolmentID,
                    'Child Name' : record.childName,
                    'Date Of Entitlement' : record.dateOfEntitlement,
                    'CCS Percentage' : record.CCSPercentage,
                    'CCS Withholding Percentage' : record.CCSWithholdingPercentage,
                    'CCS Total Hours Per Fortnight' : record.CCSTotalHoursPerFortnight,
                    'Apportioned Hours Per Fortnight' : record.apportionedHoursPerFortnight,
                    'ACCS Hourly Rate Cap Increase Percentage' : record.ACCSHourlyRateCapIncreasePercentage,
                    'Annual Cap Reached' : record.annualCapReached == 'true' ? 'Yes' : 'No',
                    'Absence Count' : record.absenceCount,
                    'Preschool Exemption' : record.preschoolExemption,
                    'Paid Absences': record.paidAbsences,
                    'Unpaid Absences': record.unpaidAbsences,
                    'Absences Available No Evidence': record.absencesAvailableNoEvidence,
                };

                masterRows.push(rows);

            });

            const csvData = this.objectToCsv(masterRows);

            this._csvService.downLoadCsvFile(csvData, 'Entitlement Report');

        });

    }

    objectToCsv(data: any): any {

        const csvRows = [];

        const headers = _.keys(_.first(data));

        csvRows.push(headers.join(','));

        for (const row of data) {

            const value = headers.map(header => {
                if (row[header]) {
                    return `"${row[header].toString().replace(/[",]/g, '')}"`;
                }
            });

            csvRows.push(value.join(','));

        }

        return csvRows.join('\n');
    }

    getViewEntitlementDependency(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-entitlement-dependancy`)
            .pipe(
                map((response) => {
                    return response.data ? response.data.map((val: any, idx: number) => new Child(val, idx)) : [];
                })
            );

    }

    unsubscribeOptions(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this.onCcsChanged.next([]);

        // reinitialize
        this._unsubscribeAll = new Subject();

        // reset all variables
        this.filterBy = null;
        this.serverErrors = null;
        this.report = null;
        this.apiData = [];
        this.eventsSet = false;
    }


    setEvents(): void {
        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;
                this.getQuery(null);
            });

        this.onFilterChangedReport
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe( filter =>{
                this.filterBy = filter;
                this.filterData.next(filter);
            });

        this.eventsSet = true;

    }

    changeServiceCredentials(data: object): Observable<any>{

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/service-credentials`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }
}

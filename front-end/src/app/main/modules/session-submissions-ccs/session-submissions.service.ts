import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
    ActivatedRouteSnapshot,
    Resolve,
    RouterStateSnapshot
} from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {shareReplay, map, takeUntil, finalize, pluck, take} from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import {CertificateOrDetermination} from '../child/accs/certificate-or-determination.model';
import {AuthService} from '../../../shared/service/auth.service';
import {PaginationProp} from '../../../shared/interface/pagination';
import {NotifyType} from '../../../shared/enum/notify-type.enum';
import {SessionReport} from './session-report.model';
import {NotificationService} from '../../../shared/service/notification.service';
import {CsvService} from '../../../shared/service/csv.service';


@Injectable({
    providedIn: 'root'
})
export class SessionSubmissionsService {
    onCcsChanged: BehaviorSubject<any>;
    onCcsChangedCount: BehaviorSubject<any>;
    onCcsChangedfilterAfterStore: BehaviorSubject<any>;
    onCcsStatusChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    actualTotal: number;
    displayTotal: number;
    validDataCount: boolean;
    branchDetails: any;
    apiData: any;
    routeParams: any;
    private _unsubscribeAll: Subject<any>;

    /*filter */
    filterBy: any = '0';
    filterData: BehaviorSubject<any>;
    eventsSet: boolean;
    /*pagination*/
   /* pagination: any | null = null;
    onPaginationChanged: Subject<PaginationProp>;
    defaultPageIndex: any = 1;
    defaultPageSize: any = 5;
    defaultPageSizeOptions: number[] = [5, 10, 20];*/
    /*new pagination*/

    onPageSizeChanged: Subject<any>;

    currentPage: any;
    currentPageSize: any;
    lastPage: boolean;
    pageData: BehaviorSubject<{ currentPage: number, pageSize: number, lastPage: boolean }>;

    defaultPageIndex: number;
    defaultPageSize: number;
    defaultPageSizeOptions: number[] = [5, 10, 20];

    serverErrors: any;

    /* sharing filter data*/
    private messageSource = new BehaviorSubject('default message');
    currentMessage = this.messageSource.asObservable();

    /* reports  */
    field:any = [];
    report: SessionReport[];
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
     * @param _csvService
     * @param _notification
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _auth: AuthService,
        private _csvService: CsvService,
        private _notification: NotificationService
        ) {
        // Set the defaults
        this.onCcsChanged = new BehaviorSubject([]);
        this.onCcsChangedCount = new BehaviorSubject([]);
        this.onCcsChangedfilterAfterStore = new BehaviorSubject([]);
        this.onCcsStatusChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.filterBy = '0';
        this._unsubscribeAll = new Subject();
        this.actualTotal = 0;
        this.displayTotal = 0;
        this.validDataCount = true;
        this.onTableLoaderChanged = new Subject();
        /* pagination */
        // this.onPaginationChanged = new Subject();
        /* new pagination */
        this.defaultPageIndex = 1;
        this.defaultPageSize = 10;
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
                name: 'enrolmentID',
                res: 'enrolmentID'
            },
            {
                index: 1,
                name: 'Session Report Start Date',
                res: 'sessionReportStartDate'
            },
            {
                index: 2,
                name: 'Session Report End Date',
                res: 'sessionReportEndDate'
            },
            {
                index: 3,
                name: 'Updated Date-Time',
                res: 'updatedDateTime'
            },

            {
                index: 4,
                name: 'Initial Submitted Date-Time',
                res: 'initialSubmittedDateTime'
            },
            {
                index: 5,
                name: 'Reason For Change',
                res: 'reasonForChange'
            },
            {
                index: 6,
                name: 'Reason For Late Change',
                res: 'reasonForLateChange'
            },
            {
                index: 7,
                name: 'Is No Care Provided',
                res: 'isNoCareProvided'
            },
            {
                index: 8,
                name: 'Fee Reduction Amount',
                res: 'feeReductionAmount'
            },

            {
                index: 9,
                name: 'Statuses',
                res: 'statuses'
            },
            {
                index: 10,
                name: 'Change Reasons',
                res: 'ChangeReasons'
            },
            {
                index: 11,
                name: 'Session Of Cares',
                res: 'SessionOfCares'
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


    /*resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        this.routeParams = route.params;
        return new Promise((resolve, reject) => {
            Promise.all([
                this.getQuery(this.routeParams.id)
            ])
                .then(([certificateOrDetermination]: [any]) => {
                    this.onFilterChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((res: any) => {
                            this.getQuery('');
                            // return this.emergency;
                        });
                    this.onPaginationChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(pagination => {

                            this.pagination = pagination;
                            this.onChangeQuery(pagination);
                        });
                    resolve();
                    return this.apiData;
                })
                .catch(error => {
                    reject(error);
                });
        });
    }*/
    getQuery(page: number | null): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onTableLoaderChanged.next(true);
            this.branchDetails = this._auth.getClient();
            const postData =  {
                filters: JSON.stringify(this.filterBy),
                branch: this.branchDetails.id,
                page: page ? page : this.currentPage,
                offset: this.currentPageSize
            }
            const params = new HttpParams()
                .set('page', page ? page : this.currentPage)
                .set('offset', this.currentPageSize)
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-session-reports`, postData )
                .pipe(
                    take(1),
                    map(response => {

                        if (response.data && response.data.ApiData && response.data.ApiData.results) {
                            this.apiData = response.data.ApiData.results;
                        } else {
                            this.apiData = [];
                        }

                        if (response.ApiData && response.ApiData.LastPage && response.ApiData.LastPage === 'true') {
                            this.lastPage = true;
                        } else {
                            this.lastPage = false;
                        }

                        if (response.ApiData && response.ApiData.ReturnError)
                        {
                            this.serverErrors = response.ApiData.ReturnMessage;
                        }
                        else {
                            this.serverErrors = null;
                        }

                        // this.isFiltered = response.filtered;

                        return {
                            item: [...this.apiData],
                            lastPage: this.lastPage,
                            serverErrors: this.serverErrors
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

                        if (page) {
                            this.currentPage = page;
                        }

                        this.pageData.next({ pageSize: this.currentPageSize, currentPage: this.currentPage, lastPage: this.lastPage });

                        resolve();

                    },
                    reject
                );

        });

    }


    getDataForReport(page: number | null): Observable<any>
    {
        // this.onTableLoaderChanged.next(true);
        this.branchDetails = this._auth.getClient();
        const postData =  {
            filters: JSON.stringify(this.filterBy),
            branch: this.branchDetails.id,
            page: page ? page : this.currentPage,
            offset: this.currentPageSize
        }
        const params = new HttpParams()
            .set('page', page ? page : this.currentPage)
            .set('offset', this.currentPageSize)
            .set('filters', JSON.stringify(this.filterBy));
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/view-session-reports`, postData )
            .pipe(
                map(response =>
                {
                    /*if (response.data)
                    {
                        this.report = response.data.map((i: any, idx: number) => new AttendanceReport(i, idx));
                        // this.totalRecords = response.totalRecords;
                        this.field = this.reportData;
                        // this.onFieldChanged.next(getSelectedField);
                    }*/

                    if (response.data && response.data.ApiData && response.data.ApiData.results) {
                        this.report = response.data.ApiData.results.map((i: any, idx: number) => new SessionReport(i, idx));
                        this.field = this.reportData;
                    } else {
                        this.apiData = [];
                        this._notification.displaySnackBar('No data found', NotifyType.INFO);
                    }

                    if (response.ApiData && response.ApiData.LastPage && response.ApiData.LastPage === 'true') {
                        this.lastPage = true;
                    } else {
                        this.lastPage = false;
                    }

                    if (response.ApiData && response.ApiData.ReturnError)
                    {
                        this.serverErrors = response.ApiData.ReturnMessage;
                    }
                    else {
                        this.serverErrors = null;
                    }

                    setTimeout(() => {
                        this.downLoadCsv('Entitlement Report', this.field);
                    }, 500);
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }


    downLoadCsv(heading: any, field):void{

        const masterRows = [];
        // tslint:disable-next-line: prefer-for-of
        for (let k = 0 ; k < this.report.length; k++) {
            const rows = {};
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0 ; i < this.field.length; i++) {
                rows[this.field[i]['name']] = (this.report[k][this.field[i]['res']] ? this.report[k][this.field[i]['res']] : 'N/A' );
            };
            masterRows.push(rows);
        };

        if(masterRows.length > 0) {
            const csvData = this.objectToCsv(masterRows);
            this._csvService
                .downLoadCsvFile(csvData, heading);
        }

        else {
            setTimeout(() => this._notification.displaySnackBar('No data found', NotifyType.INFO), 200);
            return;
        }


    }

    objectToCsv(data): any {
        const csvRows = [];
        const headers = Object.keys(data[0])
        csvRows.push(headers.join(','))
        for(const row of data) {
            const value = headers.map(header =>{
                //    const escaped = row[header].replace(/"/g, '\\"');
                //     return `"${escaped}"`
                return row[header];
            });

            csvRows.push(value.join(','));

        }
        return csvRows.join('\n');


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
    }

    setEvents(): void {

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;
                this.filterData.next(filter);
                this.resetPagination();
                this.getQuery(null);
            });
        this.onFilterChangedReport
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe( filter =>{
                this.filterBy = filter;
                this.filterData.next(filter);
                this.resetPagination();
            });
        this.onPageSizeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageSize: number) => {
                this.currentPageSize = pageSize;
            });

        this.eventsSet = true;

    }


    nextPage(): void {
        this.getQuery(this.currentPage + 1);
    }

    previousPage(): void {

        const page = this.currentPage - 1;

        if (!page || page < 1) {
            return;
        }

        this.getQuery(this.currentPage - 1);

    }

    resetPagination(emit: boolean = true, resetSize: boolean = false): void {
        this.currentPage = this.defaultPageIndex;
        this.lastPage = true;

        if (resetSize) {
            this.currentPageSize = this.defaultPageSize;
        }

        if (emit) {
            this.pageData.next({ pageSize: this.currentPageSize, currentPage: this.currentPage, lastPage: this.lastPage });
        }
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

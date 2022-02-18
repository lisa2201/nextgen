import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
    ActivatedRouteSnapshot,
    Resolve,
    RouterStateSnapshot
} from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize, pluck } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { CcsSetup } from '../../ccs-setup/ccs-setup.model';
import { ProviderMessage } from '../../ccs-setup/provider-notification/model/provider-message.model';
import { CorrenpondenceList } from '../../ccs-setup/provider-notification/model/correspondence-list.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import {CcsEntitlementModel} from '../model/ccs-entitlement.model';
import {WaitlistEnrollment} from '../../waitlist-enrollment/waitlist-enrollment-list/waitlist-enrollment.model';
import {ReportModel} from '../../report/model/report.model';
import {ContactReport} from '../../report/contact-reports/model/contact-report.model';
import {NotifyType} from '../../../../shared/enum/notify-type.enum';
import {JsPDFService} from '../../../../shared/service/pdf.service';
import {CsvService} from '../../../../shared/service/csv.service';
import {NotificationService} from '../../../../shared/service/notification.service';

@Injectable()
export class CcsEntitlementHistoryService implements Resolve<any> {
    onMessageChanged: BehaviorSubject<any>;
    onCorrenpondenceListChanged: BehaviorSubject<any>;
    onMessageChangedCount: BehaviorSubject<any>;
    onMessageChangedfilterAfterStore: BehaviorSubject<any>;
    onCcsStatusChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onFilterRangeChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    onTableLoaderChangedCore: Subject<any>;
    onFilterChangedReport: Subject<any>;

    actualTotal: number;
    displayTotal: number;

    private messagelist: ProviderMessage[];
    private correspondencelist: CorrenpondenceList[];
    private _unsubscribeAll: Subject<any>;

    // pagination
    pagination: any | null = null;
    defaultPageIndex: any;
    defaultPageSize: any;
    defaultPageSizeOptions: number[];
    totalRecords: number;
    totalDisplayRecords: number;
    onPaginationChanged: Subject<any>;

    filterBy: any = '0';
    // flterByRange: any;
    filterByRange = {
        sDate: '',
        eDate: ''
    };
    report: CcsEntitlementModel[];

    field:any = [];
    reportData: any;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param _pdfService
     * @param _csvService
     * @param _notification
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _pdfService: JsPDFService,
        private _csvService: CsvService,
        private _notification: NotificationService,
    ) {
        // Set the defaults
        this.onMessageChanged = new BehaviorSubject([]);
        this.onCorrenpondenceListChanged = new BehaviorSubject([]);
        this.onMessageChangedCount = new BehaviorSubject([]);
        this.onMessageChangedfilterAfterStore = new BehaviorSubject([]);
        // this.onCcsStatusChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.onFilterRangeChanged = new Subject();
        this.filterBy = null;
        // this.flterByRange = null;
        this._unsubscribeAll = new Subject();
        this.actualTotal = 0;
        this.displayTotal = 0;
        this.onTableLoaderChanged = new Subject();
        this.onTableLoaderChangedCore = new Subject();

        this.defaultPageIndex = 1;
        this.defaultPageSize = 25;
        this.defaultPageSizeOptions = [10, 25, 50];
        this.onPaginationChanged  = new Subject();
        this.reportData = [
            {
                index: 0,
                name: 'Enrolment ID',
                res: 'enrolmentId'
            },
            {
                index: 1,
                name: 'Child Name',
                res: 'childName'
            },
            {
                index: 2,
                name: 'Date Of Entitlement',
                res: 'date'
            },
            {
                index: 3,
                name: 'CCS Percentage',
                res: 'ccsPercentage'
            },
            {
                index: 4,
                name: 'CCS Withholding Percentage',
                res: 'ccsWithholdingPercentage'
            },
            {
                index: 5,
                name: 'CCS Total Hours',
                res: 'ccsTotalHours'
            },
            {
                index: 5,
                name: 'Apportioned Hours',
                res: 'apportionedHours'
            },
            {
                index: 2,
                name: 'ACCS Hourly Rate Cap Increase Percentage',
                res: 'accsHourlyRateCapIncrease'
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
                res: 'preSchoolExcemption'
            },
            {
                index: 3,
                name: 'Old CCS Percentage',
                res: 'oldCCSPercentage'
            },
            {
                index: 3,
                name: 'Old CCS Hours',
                res: 'oldCCSHours'
            },
        ];
        this.onFilterChangedReport = new Subject()
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
    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        return new Promise((resolve, reject) => {
            Promise.all([])
                .then(([message]: [any]) => {
                   /* this.onFilterChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(filter => {
                            this.filterBy = filter;

                            this.getMessageData();
                        });*/
                    this.setEvents();
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * Get message list
     *
     * @returns {Promise<any>}
     */

    getMessageData(): Promise<any> {
        this.onTableLoaderChanged.next(true);

        if (_.isNull(this.pagination)) {
            // set default value
            this.pagination = {
                page: this.defaultPageIndex,
                size: this.defaultPageSize
            };
        }

        const params = new HttpParams()
            .set('page', this.pagination.page)
            .set('offset', this.pagination.size)
            .set('filters', (this.filterBy) ? JSON.stringify(this.filterBy) : JSON.stringify({ date : DateTimeHelper.getUtcDate(new Date())}));

        return new Promise((resolve, reject) => {
            this._httpClient
                .get<any>(
                    `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-ccs-entitlement-history`,
                    { params }
                )
                .pipe(
                    map(response => {
                        this.messagelist = response.data.map((i: any) => new CcsEntitlementModel(i));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.messagelist],
                            totalDisplay: this.messagelist.length,
                            total: this.totalRecords,
                        };

                    }),
                    finalize(() =>
                        setTimeout(
                            () => this.onTableLoaderChanged.next(false),
                            200
                        )
                    ),
                    shareReplay()
                )
                .subscribe((response: any) => {

                    this.displayTotal = response.length;

                    this.onMessageChanged.next(response);

                    resolve();
                }, reject);
        });
    }


    setEvents(){

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;
                this.getMessageData();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
                this.getMessageData();
            });
        this.onFilterChangedReport
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe( filter =>{
                this.filterBy = filter;
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            });
    }

    getDataForReport(data: object, isPdf: boolean): Observable<any>
    {

        const params = new HttpParams()
            .set('page', this.pagination.page)
            .set('offset', this.pagination.size)
            .set('report', 'true')
            .set('filters', (this.filterBy) ? JSON.stringify(this.filterBy) : JSON.stringify({ dateChanged : DateTimeHelper.getUtcDate(new Date())}));
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-ccs-entitlement-history`,
                { params }
                )
            .pipe(
                map(response =>
                {
                    if (response.data)
                    {
                        this.report = response.data.map((i: any, idx: number) => new CcsEntitlementModel(i));
                        this.totalRecords = response.totalRecords;
                        this.field = this.reportData;
                        // this.onFieldChanged.next(getSelectedField);
                    }
                    setTimeout(() => {
                        isPdf ? this.downLoadPdf('Entitlement History Report ' + DateTimeHelper.getUtcDate(new Date()), new Date()) : this.downLoadCsv('Entitlement History Report ' + DateTimeHelper.getUtcDate(new Date()), this.field);
                    }, 500);
                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    getPrintViewContent(field: any, report:CcsEntitlementModel[]): Array<any>
    {
        const data: Array<any> = [];
        const headers: Array<any> = [];
        _.map(field, (val)=>{
            headers.push(
                {text: val.name, color: '#ffffff', fillColor: '#009fe9'}
            )
        })

        data.push(headers);
        _.map(report, (reo) => {
            const rows: Array<any> = [];
            _.map(field, (fe) => {
                rows.push(reo[fe['res']] ? reo[fe['res']]  : 'N/A' );
            })
            data.push(rows);
        })
        return data;
    }


    downLoadPdf(heading: any, start):void{
        setTimeout(() => {
            const date = 'Date:' + start ;
            const content = this.getPrintViewContent(this.field, this.report);
            this._pdfService
                .print('download',this.field, content, heading, date);
        }, 500);
    }

    downLoadCsv(heading: any, field):void{

        const masterRows = [];

        _.map(this.report, (reo) => {
            const rows = {};
            _.map(field, (fe) => {
                rows[fe['name']] = reo[fe['res']] ? reo[fe['res']]  : 'N/A';
            })
            masterRows.push(rows);
        })

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
        this.filterBy = null;
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._unsubscribeAll = new Subject();
        this.onMessageChanged.next([]);
    }

}

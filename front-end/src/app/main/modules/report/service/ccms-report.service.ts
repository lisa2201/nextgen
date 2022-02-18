import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';
import { PaginationProp } from 'app/shared/interface/pagination';
import { ChildrenService } from '../../child/services/children.service';
import 'jspdf-autotable'
import { JsPDFService } from 'app/shared/service/pdf.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { SortProp } from 'app/shared/interface/sort';
import { CsvService } from 'app/shared/service/csv.service';
import { AttendanceReport } from '../attendance-reports/model/attendance-report.model';
import { Child } from '../../child/child.model';
import { ReportDependencyervice } from './report-dependencey.service';
import { CCSEnromentArrangementType, CCSEnromentReportType } from '../ccms-reports/report-filter/report-filter.component';
import { Room } from '../../room/models/room.model';
import { Enrolment } from '../../child/enrolment/models/enrolment.model';



@Injectable()
export class CCMSReportservice implements Resolve<any>
{
    private _unsubscribeAll: Subject<any>;
    report: AttendanceReport[];
    children: Child[];
    onReportChanged: BehaviorSubject<any>;
    onChildrenChanged: BehaviorSubject<any>;
    onFilterDependencyChanged: BehaviorSubject<any>;
    onChildChanged: BehaviorSubject<any>;
    onPaginationChanged: Subject<PaginationProp>;
    onFieldChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onTableLoaderChanged: Subject<any>;
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
    field:any = [];
    reportType:string = null;
    reportHeading: string;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _pdfService: JsPDFService,
        private _csvService: CsvService,
        private _notification: NotificationService,
        private _reportDependencyervice:ReportDependencyervice
    ) {
        // Set the defaults
        this.report = [];
        this._unsubscribeAll = new Subject();
        this.onFieldChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();

        this.onReportChanged = new BehaviorSubject([]);
        this.onChildrenChanged = new BehaviorSubject([]);
        this.onChildChanged = new BehaviorSubject([]);
        this.onFilterDependencyChanged = new BehaviorSubject([]);
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
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {


        return new Promise<void>((resolve, reject) =>
        { 
            Promise.all([
                this._reportDependencyervice.getAllRooms(),
                this._reportDependencyervice.getDependency().toPromise()
            ])
            .then(([rooms,depend]: [Room[], any]) => 
            {  
                this.setEvents({
                    rooms: rooms,
                    depend: depend
                });
                
                resolve();
            })
            .catch(errorResponse => 
            {
                reject(errorResponse);
            });
        });
    }

    setEvents(depends: { rooms: Room[], depend: any } = null): void 
    {
        console.log(depends);
        
        if (!_.isNull(depends))
        {
            this.onFilterDependencyChanged.next(depends);
        }
        
    }

    getEnrolmentReportData(data: object, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/ccs-enrolment-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data
                        console.log(response);
                        
                        this.onReportChanged.next({
                            records: response.data.map((i: any, idx: number) => new Enrolment(i, idx)),
                            total: response.totalRecords,
                            type: type
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.getEnrolmentReportPdf(response.data.map((i: any, idx: number) => new Enrolment(i, idx)));
                        } else {
                            // Csv
                            this.getEnrolmentReportCsv(response.data.map((i: any, idx: number) => new Enrolment(i, idx)));
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    getEnrolmentReportPdf(reportData: Enrolment[]): void {

        const data: Array<any> = [];

        const headings = ['Enrolment Id', 'Child First Name', 'Child Last Name', 'Arrangement Type', 'Session Type', 'Status', 'Start Date', 'End Date', 'Created Date'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        data.push(headers);

        _.forEach(reportData, (record: Enrolment) => {

            data.push([
                record.enrolId || 'N/A',
                record.child.firstName || 'N/A',
                record.child.lastName || 'N/A',
                record.arrangementTypeLabel || 'N/A',
                record.sessionTypeLabel || 'N/A',
                record.statusLabel || 'N/A',
                record.enrolStart || 'N/A',
                record.enrolEnd || 'N/A',
                record.created || 'N/A'
            ]);

        });

        this._pdfService.print('download', headings, data, 'CCS Enrolment Report', null);

    }

    getEnrolmentReportCsv(reportData: Enrolment[]): void {

        const masterRows = [];
        
        _.forEach(reportData, (record: Enrolment) => {

            const rows = {
                'Enrolment Id' : record.enrolId || 'N/A',
                'Child First Name' : record.child.firstName || 'N/A',
                'Child Last Name' : record.child.lastName || 'N/A',
                'Arrangement Type' : record.arrangementTypeLabel || 'N/A',
                'Session Type' : record.sessionTypeLabel || 'N/A',
                'Status' : record.statusLabel || 'N/A',
                'Start Date': record.enrolStart || 'N/A',
                'End Date' : record.enrolEnd || 'N/A',
                'Created Date': record.created || 'N/A',
            };

            masterRows.push(rows);

        });

        const csvData = this.objectToCsv(masterRows);

        console.log(csvData);
        
        this._csvService.downLoadCsvFile(csvData, 'CCS Enrolment Report');

    }


    objectToCsv(data: any): any {

        console.log(data);
        
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

        /**
     * Unsubscribe options
     */

    getReportTypes(): CCSEnromentReportType[] {
        return [
            {
                name: 'CCS Enrolment Report',
                value: AppConst.CCMSReportTypes.CCMS_ENROLMENT_REPORT
            }
        ];
    }

    getEnrolmentArrangementTypes(): CCSEnromentArrangementType[] {
        return [
            {
                name: 'Complying Written Arrangements (CCS)',
                value: AppConst.CCSEnromentArrangementType.CCMS_ENROLMENT_CWA
            },
            {
                name: 'Relevant Arrangements (Do not want CCS)',
                value: AppConst.CCSEnromentArrangementType.CCMS_ENROLMENT_RA
            },
            {
                name: 'Child Wellbeing (ACCS)',
                value: AppConst.CCSEnromentArrangementType.CCMS_ENROLMENT_ACCS
            },
            {
                name: 'Arrangement with another organization',
                value: AppConst.CCSEnromentArrangementType.CCMS_ENROLMENT_OA
            }
        ];
    }

    unsubscribeOptions(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        this.onReportChanged.next([]);

        // reset all variables
        this.pagination = null;
        this.filterBy = null;
        this.sortBy = null;
        this.field = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
        this.field  = null;
        this.report = null
    }

    clearLastRememberOptions(): void
    {
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

}

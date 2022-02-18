import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, finalize, takeUntil } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import 'jspdf-autotable'
import * as _ from 'lodash';

import { AppConst } from 'app/shared/AppConst';
import { User } from 'app/main/modules/user/user.model';
import { JsPDFService } from 'app/shared/service/pdf.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { CsvService } from 'app/shared/service/csv.service';
import { FinanceReportType } from '../finance-report/model/finance-report.model';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import {Room} from '../../room/models/room.model';
import {ReportDependencyervice} from './report-dependencey.service';

@Injectable()
export class FinanceReportservice implements Resolve<any>
{

    private _unsubscribeAll: Subject<any>;
    private userAccounts: User[];

    onUserAccountsChanged: BehaviorSubject<any>;
    onReportChanged: BehaviorSubject<any>;
    onOpeningBalanceReportChanged: BehaviorSubject<any>;
    onTableLoaderChanged: Subject<any>;
    onUserLoaderChanged: Subject<any>;
    totalRecords: number;
    reportType:string = null;
    onDefaultFilterChanged: BehaviorSubject<any>;
    onFilterChanged: Subject<any>;
    filterBy: any | null = null;
    defaultFilter: any = {
        primary_payer: 'yes',
        parent_status: '0',
    };

    rawReportData: any;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param _pdfService
     * @param _pdfHelperService
     * @param _csvService
     * @param _reportDependencyervice
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _pdfService: JsPDFService,
        private _pdfHelperService: PDFHelperService,
        private _csvService: CsvService,
        private _reportDependencyervice: ReportDependencyervice
    ) {
        // Set the defaults
        this._unsubscribeAll = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.onUserLoaderChanged = new Subject();

        this.onReportChanged = new BehaviorSubject([]);
        this.onOpeningBalanceReportChanged = new BehaviorSubject([]);
        this.onUserAccountsChanged = new BehaviorSubject([]);
        this.onDefaultFilterChanged = new BehaviorSubject({...this.defaultFilter});
        this.filterBy = {...this.defaultFilter};

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
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any> {

        /*return this.getUsers()
            .then(() => {
                this.setEvents();
            });*/
        return new Promise<void>((resolve, reject) => {
            Promise.all([
                this._reportDependencyervice.getChildren(),
                this._reportDependencyervice.getAllRooms(),
            ])
                .then(([user, room]: [any, Room[]]) => {

                    this.getUsers(),
                    this.setEvents();

                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });

    }

    // ----------------------------------------------Aged Debtors----------------------------------------------//

    getAgedDebtorsReportData(data: object, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/aged-debtors-finance-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data

                        this.onReportChanged.next({
                            records: response.data?.report_data || [],
                            total: response.data?.totalRecords || [],
                            type: type,
                            requestData: data
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.agedDebtorsPdf(response.data?.report_data || [], data);
                        } else {
                            // Csv
                            this.agedDebtorsCsv(response.data?.report_data || [], data);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    agedDebtorsPdf(reportData: any, requestData: any): void {

        const data: Array<any> = [];
        const prepaid = requestData?.prepaid === true ? true : false;

        const headings = ['Full Name', 'Children','Email', 'Phone', 'Prepaid', '0-7 Days', '8-14 Days', '15-30 Days', '31-60 Days', '61+ Days', 'Total Owing'];

        if (!prepaid) {
            headings.splice(4, 1);
        }

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        data.push(headers);

        _.forEach(reportData, (record) => {

            let arr = [];

            if (record.type === 'user') {

                arr = [
                    record.full_name,
                    record.children,
                    record.email,
                    record.phone,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.prepaid),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category1),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category2),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category3),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category4),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category5),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.user_total)
                ];

            } else {

                arr = [
                    { text: record.full_name, bold: true },
                    record.children,
                    record.email,
                    record.phone,
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.prepaid), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category1), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category2), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category3), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category4), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category5), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.user_total), bold: true }
                ];
                
            }

            if (!prepaid) {
                arr.splice(4, 1);
            }
            
            data.push(arr);

        });

        const pageTitle = 'Aged Debtors Report';
        const pageType = 'A4';
        const isLandscape = headings.length > 8 ?  true : false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: `Debtors as of ${DateTimeHelper.parseMoment(requestData.edate).format('DD-MM-YYYY')}`, style: 'date' },
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    // widths: ['auto', '15%', '15%', '15%', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'], // _.fill(new Array(headings.length), 'auto'),
                    widths: ['10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%'], // _.fill(new Array(headings.length), 'auto'),
                    body: data
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            }
        ];

        const styles = {
            header: {
                fontSize: 21,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 12,
                // margin: [0, 10, 0, 0],
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 14,
                bold: false,
                margin: [0, 10, 0, 5]
            },
        };


        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });


    }

    agedDebtorsCsv(reportData: any, requestData: any): void {

        const prepaid = requestData?.prepaid === true ? true : false;

        const headings = ['Full Name', 'Children','Email', 'Phone', 'Prepaid', '0-7 Days', '8-14 Days', '15-30 Days', '31-60 Days', '61+ Days', 'Total Owing'];
        
        if (!prepaid) {
            headings.splice(4, 1);
        }

        const masterRows = [
            [`Debtors as of ${DateTimeHelper.parseMoment(requestData.edate).format('DD-MM-YYYY')}`],
            headings,
            ...reportData.map((record: any) => {

                const arr = [
                    record.full_name,
                    _.replace(record.children, ',', '|'),
                    record.email,
                    record.phone,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.prepaid),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category1),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category2),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category3),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category4),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.category5),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.user_total),
                ];

                if (!prepaid) {
                    arr.splice(4, 1);
                }

                return arr;

            })
        ];

        const csvData = this.makeCsvData(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Aged Debtors Report');

    }

    // ----------------------------------------------Income Summary----------------------------------------------//

    getIncomeSummaryReportData(data: any, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/income-summary-finance-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data?.week_array || [],
                            total: response.data?.totals || {},
                            type: type,
                            requestData: data
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.incomeSummaryPdf(response.data?.week_array || [], response.data?.totals || {}, data.sdate, data.edate);
                        } else {
                            // Csv
                            this.incomeSummaryCsv(response.data?.week_array || []);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    incomeSummaryPdf(reportData: any, grandTotal: any, sdate: any, eddate: any): void {

        const data: Array<any> = [];
        const date = `Date: ${sdate} to ${eddate}`;

        const headings = ['Parent Name', 'Week Ending', 'Fee', 'CCS', 'Parent Total'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        data.push(headers);

        _.forEach(reportData, (record) => {

            _.forEach(record.users_array, (user) => {

                if (user.type ===  'parent') {
                    data.push([
                        `${user.first_name} ${user.last_name}`,
                        record.week_end,
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.fee),
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.ccs),
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.parent_total),
                    ]);
                } else {
                    data.push([
                        { text: 'Total For Week', bold: true },
                        '',
                        { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.fee), bold: true },
                        { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.ccs), bold: true },
                        { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.parent_total), bold: true }
                    ]);
                }

            });

        });

        data.push([
            { text: 'Grand Total', bold: true },
            '',
            { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(grandTotal.fee), bold: true },
            { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(grandTotal.ccs), bold: true },
            { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(grandTotal.parent_total), bold: true }
        ]);

        this._pdfService.print('download', headings, data, 'Income Summary Report', date);

    }

    incomeSummaryCsv(reportData: any): void {

        const masterRows = [];
        
        _.forEach(reportData, (record) => {

            _.forEach(record.users_array, (user) => {

                let row = {
                    'Parent Name': `${user.first_name} ${user.last_name}`,
                    'Week Ending': record.week_end,
                    'Fee': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.fee),
                    'CCS': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.ccs),
                    'Parent Total': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(user.parent_total) 
                };

                if (user.type ===  'parent') {
                    row = {...row, ...{'Parent Name': `${user.first_name} ${user.last_name}`, 'Week Ending': record.week_end,}};
                } else {
                    row = {...row, ...{'Parent Name': `Total For Week`, 'Week Ending': ''}};
                }

                masterRows.push(row);

            });


        });

        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Income Summary Report');

    }

    // ----------------------------------------------Transaction Listing----------------------------------------------//

    getTransactionReportData(data: any, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        const user: User = (_.isArray(data.user_objects) && data.user_objects.length === 1) ? _.first(data.user_objects) : null;
        const children = user ? (_.join(_.map(user?.children, (child: any) => { return `${child.f_name} ${child.l_name}`}), '|')) : null;

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/transaction-summary-finance-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data || [],
                            total: null,
                            type: type,
                            requestData: data
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.transactionReportPdf(response.data, data.sdate, data.edate, user, children);
                        } else {
                            // Csv
                            this.transactionReportCsv(response.data, user, children);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    transactionReportPdf(reportData: any, sdate: any, eddate: any, user, children): void {

        const data: Array<any> = [];
        const date = `Date: ${sdate} to ${eddate}`;

        const headings = ['Type', 'Debit', 'Credit', 'Total'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        data.push(headers);

        _.forEach(reportData, (record) => {

            if (record.type === 'total') {

                data.push([
                    { text: record.name, bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.debit_amount), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.credit_amount), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.total), bold: true }
                ]);

            } else {

                data.push([
                    record.name,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.debit_amount),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.credit_amount),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.total),
                ]);

            }

        });

        const pageTitle = 'Transaction Summary Report';
        const pageType = 'A4';
        const isLandscape = headings.length > 8 ?  true : false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: date, style: 'date' },
            user ? {text: `Parent: ${user.getFullName()}`, style: 'userinfo'} : null,
            children ? {text: `Children: ${children}`, style: 'userinfo'} : null,
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: _.fill(new Array(headings.length), 'auto'),
                    body: data
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            }
        ];

        const styles = {
            header: {
                fontSize: 8,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 8,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            userinfo: {
                fontSize: 8,
                margin: [0 ,8 , 0, 0]
            },
            table: {
                fontSize: 8,
                margin: [0, 10, 0, 0]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            }
        }


        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });


    }

    transactionReportCsv(reportData: any, user: any, children: any): void {

        const masterRows = [];
        
        _.forEach(reportData, (record) => {

            const rows = {
                'Type' : record.name,
                'Debit' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.debit_amount),
                'Credit' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.credit_amount),
                'Total' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.total)
            };

            masterRows.push(rows);

        });
        
        const csvRows = [];

        if (user) {
            csvRows.push(_.join(['Parent', user.getFullName()],','));
        }

        if (children) {
            csvRows.push(_.join(['Children', children],','));
        }

        const headers = _.keys(_.first(masterRows));

        csvRows.push(headers.join(','));

        for (const row of masterRows) {

            const value = headers.map(header => {
                if (row[header]) {
                    return `"${row[header].toString().replace(/[",]/g, '')}"`;
                }
            });

            csvRows.push(value.join(','));

        }

        const csvData = csvRows.join('\n');

        this._csvService.downLoadCsvFile(csvData, 'Transaction Summary Report');

    }

    // ----------------------------------------------Account Balance Report----------------------------------------------//

    getAccountBalanceReportData(data: any, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/account-balance-finance-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data || [],
                            total: null,
                            type: type,
                            requestData: data
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.accountBalanceReportPdf(response.data, data.sdate, data.edate);
                        } else {
                            // Csv
                            this.accountBalanceReportCsv(response.data);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    accountBalanceReportPdf(reportData: any, sdate: any, eddate: any): void {

        const debitdata: Array<any> = [];
        const creditdata: Array<any> = [];
        const date = `Account balance as of date ${eddate}`;

        const headings = ['Account Name', 'Email', 'Phone', 'Balance'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        const headers1 = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        debitdata.push(headers);
        creditdata.push(headers1);

        _.forEach(reportData.debit_data, (record) => {

            if (record.type === 'total') {

                debitdata.push([
                    { text: record.account_name, bold: true },
                    '',
                    '',
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.balance), bold: true }
                ]);

            } else {

                debitdata.push([
                    record.account_name,
                    record.email,
                    record.phone,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.balance),
                ]);

            }

        });

        _.forEach(reportData.credit_data, (record) => {

            if (record.type === 'total') {

                creditdata.push([
                    { text: record.account_name, bold: true },
                    '',
                    '',
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.balance), bold: true }
                ]);

            } else {

                creditdata.push([
                    record.account_name,
                    record.email,
                    record.phone,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.balance),
                ]);

            }

        });

        const pageTitle = 'Account Balance Report';
        const pageType = 'A4';
        const isLandscape = headings.length > 8 ?  true : false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: date, style: 'date' },
            {text: 'Debt Balance', style: 'subheader'},
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: _.fill(new Array(headings.length), 'auto'),
                    body: debitdata
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            },
            {text: 'Credit Balance', style: 'subheader'},
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: _.fill(new Array(headings.length), 'auto'),
                    body: creditdata
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            }
        ];

        const styles = {
            header: {
                fontSize: 21,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 12,
                // margin: [0, 10, 0, 0],
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 14,
                bold: false,
                margin: [0, 10, 0, 5]
            },
        };


        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });

    }

    accountBalanceReportCsv(reportData: any): void {

        const masterRows = [];
        
        _.forEach(reportData.debit_data, (record) => {

            const rows = {
                'Account Name' : record.account_name,
                'Email' : record.email,
                'Phone' : record.phone,
                'Balance' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.balance)
            };

            masterRows.push(rows);

        });

        _.forEach(reportData.credit_data, (record) => {

            const rows = {
                'Account Name' : record.account_name,
                'Email' : record.email,
                'Phone' : record.phone,
                'Balance' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.balance)
            };

            masterRows.push(rows);

        });
        

        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Account Balance Report');

    }

    // ----------------------------------------------   Bond Report---------------------------------------------- //
    getBondReportData(data: any, type:string, view?:boolean, pdf?: boolean): Observable<any>
    {
        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-bond-report`, data)
            .pipe(
                map(response =>
                {
                    this.rawReportData = response.data || [];

                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data || [],
                            total: null,
                            type: type,
                            requestData: data
                        });

                    } else {

                        if (pdf) {
                            // PDF
                            this.bondReportPdf(response.data, data.sdate, data.edate);
                        } else {
                            // Csv
                            this.bondReportCsv(response.data);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    bondReportPdf(reportData: any, sdate: any, eddate: any): void {

        const bondReportData: Array<any> = [];
        const date = `Bond Report from  ${sdate} to ${eddate}`;

        const headings = ['Parent', 'Child', 'Bond Received', 'Bond Returned', 'Amount Held'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val,
                color: '#ffffff',
                fillColor: '#009fe9'
            };
        });

        bondReportData.push(headers);

        _.forEach(reportData, (record) => {

            if (record.type === 'item') {

                bondReportData.push([
                    record.parent,
                    record.child,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.bondReceived),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.bondReturned),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.amountHeld),
                ]);

            } else {

                bondReportData.push([
                    { text: record.parent, bold: true },
                    { text: record.child, bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.bondReceived), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.bondReturned), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.amountHeld), bold: true }
                ]);

            }


        });


        const pageTitle = 'Bond Report';
        const pageType = 'A4';
        const isLandscape = headings.length > 8 ?  true : false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: date, style: 'date' },
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: _.fill(new Array(headings.length), 'auto'),
                    body: bondReportData
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            },
        ];

        const styles = {
            header: {
                fontSize: 21,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 12,
                // margin: [0, 10, 0, 0],
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 14,
                bold: false,
                margin: [0, 10, 0, 5]
            },
        };


        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });

    }

    bondReportCsv(reportData: any): void {

        const masterRows = [];

        _.forEach(reportData, (record) => {

            const rows = {
                'Parent' : record.parent,
                'Child': record.child,
                'Bond Received' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.bondReceived),
                'Bond Returned' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.bondReturned),
                'Amount Held' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.amountHeld),
            };

            masterRows.push(rows);

        });


        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Bond Report');

    }

    // ------------------------------------------- Financial Adjustment Report --------------------------------------------- //
    getFinancialAdjustmentReportData(data: any, type:string, view?:boolean, pdf?: boolean): Observable<any>
    {
        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-adjustment-report`, data)
            .pipe(
                map(response =>
                {
                    this.rawReportData = response.data || [];
                    //console.log(this.rawReportData);
                    /*this.rawReportData.sort((a, b) => {
                        if(b.child && a.child)
                            return a.child.first_name.toUpperCase() < b.child.first_name.toUpperCase()? -1 : 1;
                    });*/
                    let totalForEachItem;
                    let grandTotal = 0;
                    let itemName;

                    var count = 0;
                    for(const x in this.rawReportData)
                    {
                        count++;
                        totalForEachItem = 0;
                        /*if the incoming item has multiple records, sort them by child name*/
                        if(this.rawReportData[x].length)
                        {
                            this.rawReportData[x].sort((a, b) => {
                                if(b.child && a.child)
                                    return a.child.first_name.toUpperCase() < b.child.first_name.toUpperCase()? -1 : 1;
                            });
                        }
                        /* if the incoming item is not an array, it should be converted to an array*/
                        else
                        {
                            let arr = new Array();
                            for(const z in this.rawReportData[x])
                                arr.push(this.rawReportData[x][z])
                            // arr.push(this.rawReportData[x][Object.keys(this.rawReportData[x])[0]]);
                            this.rawReportData[x] = arr;
                        }
                        for(const y in this.rawReportData[x])
                        {
                            itemName = this.rawReportData[x][y].item.name;
                            if(this.rawReportData[x][y].header.type === 'discount')
                            {
                                totalForEachItem = totalForEachItem + this.rawReportData[x][y].header.amount;
                            }
                            else
                            {
                                totalForEachItem = totalForEachItem - this.rawReportData[x][y].header.amount;
                            }
                            let middleName = '';
                            middleName  = this.rawReportData[x][y].child.middle_name? this.rawReportData[x][y].child.middle_name : '';
                            this.rawReportData[x][y].child.fullName = this.rawReportData[x][y].child.first_name + ' ' + middleName + ' ' + this.rawReportData[x][y].child.last_name;
                            this.rawReportData[x][y].date  = DateTimeHelper.parseMoment(this.rawReportData[x][y].date).format('MMM DD, YYYY');
                        }
                        this.rawReportData[x].total = totalForEachItem;
                        this.rawReportData[x].push({
                            'total' : totalForEachItem,
                            'item' : itemName,
                        });
                        grandTotal = grandTotal + totalForEachItem;
                        if(Object.keys(this.rawReportData).length === count)
                            this.rawReportData[x].push({
                                'GrandTotal' : grandTotal,
                                'item' : 'Total of Financial Adjustments '
                            })

                    }
                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data || [],
                            total: null,
                            type: type,
                            requestData: data
                        });

                    } else {

                        if (pdf) {
                            // PDF
                            this.financialAdjustmentsReportPdf(response.data, data.sdate, data.edate);
                        } else {
                            // Csv
                            this.financialAdjustmentsReportCsv(response.data);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    financialAdjustmentsReportPdf(reportData: any, sdate: any, eddate: any): void {

        const bondReportData: Array<any> = [];
        const date = `Financial Adjustments Report from  ${sdate} to ${eddate}`;

        const headings = ['Date', 'Child', 'Type', 'Amount'];


        const pageTitle = 'Bond Report';
        const pageType = 'A4';
        const isLandscape = headings.length > 8 ?  true : false;
        /*const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: date, style: 'date' },

        ];*/
        const content = [];
        content.push({ text: pageTitle, style: 'header' });
        content.push({ canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]});
        content.push({ text: date, style: 'date'});
        let count = 0;
        _.forEach(reportData, (record) => {
            count++;
            const financialAdjustmentsReportTable: Array<any> = [];

            _.forEach(record, (item) => {
                if(item.total)
                    content.push({ text: item.item, style: 'subheader'})
            })

            const headers = _.map(headings, (val)=>{
                return {
                    text: val,
                    color: '#ffffff',
                    fillColor: '#009fe9'
                };
            });
            financialAdjustmentsReportTable.push(headers);

            _.forEach(record, (item) => {

                if(item.child)
                    financialAdjustmentsReportTable.push([
                    item.date,
                    item.child.fullName,
                    (item.header.type === 'other_fee') ? 'Credit' : 'Debit',
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(item.header.amount),
                ]);

            });

            content.push({
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: [100, 240, 40, 100],
                    body: financialAdjustmentsReportTable
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node) => 0,
                    hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node) => null
                },
                style: 'table'
            })

            _.forEach(record, (item) => {
                if(item.total)
                    content.push({ text: 'Total of ' + item.item + ':  ' + Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(item.total), style: 'subheader'})
            });

            if(Object.keys(reportData).length === count)
            _.forEach(record, (item) => {
                if(item.GrandTotal)
                {
                    content.push({ text: '', style: 'subheader'});
                    content.push({ text: 'Total of Financial Adjustments :  ' + Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(item.GrandTotal), style: 'subheader'});
                }
            })
        });

        const styles = {
            header: {
                fontSize: 21,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 12,
                // margin: [0, 10, 0, 0],
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 14,
                bold: false,
                margin: [0, 10, 0, 5]
            },
        };


        this._pdfHelperService
            .generatePDF('open', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });

    }

    financialAdjustmentsReportCsv(reportData: any): void {

        let masterRows = [];

        console.log(reportData);

        let count = 0;
        _.forEach(reportData, (record) => {
            count++;
            const rows = []
            _.forEach(record, (item) => {
                if(item.total)
                rows.push({
                    'Date' : item.item,
                    'Child': '',
                    'Type' : '',
                    'Amount' : '',
                });

                // masterRows.concat(rows);
            })

            _.forEach(record, (item) => {
                if(item.child)
                rows.push({
                    'Date' : item.date,
                    'Child': item.child.fullName,
                    'Type' : (item.header.type === 'other_fee') ? 'Credit' : 'Debit',
                    'Amount': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(item.header.amount),
                });
                // masterRows.concat(rows);
            });


            _.forEach(record, (item) => {
                if(item.total)
                {
                    rows.push({
                        'Date' : 'Total of ' + item.item,
                        'Child': '',
                        'Type' : '',
                        'Amount' : Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(item.total),
                    });
                    rows.push({
                        'Date' : '',
                        'Child': '',
                        'Type' : '',
                        'Amount' : '',
                    });
                }
            });

            if(Object.keys(reportData).length === count)
                _.forEach(record, (item) => {
                    if(item.GrandTotal)
                        rows.push({
                            'Date' : 'Total of Financial Adjustments ',
                            'Child': '',
                            'Type' : '',
                            'Amount' : Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(item.GrandTotal),
                        });
                })
            masterRows = masterRows.concat(rows);
        });
        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Financial Adjustments Report');

    }

    // ----------------------------------------------Weekly Revenue Summary Report----------------------------------------------//

    getWeeklyRevenueSummaryReportData(data: any, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/weekly-revenue-summary-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data || [],
                            total: response.data || {},
                            type: type,
                            requestData: data
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.weeklyRevenueSummaryPdf(response.data || [], data.sdate, data.edate);
                        } else {
                            // Csv
                            this.weeklyRevenueSummaryCsv(response.data || []);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    weeklyRevenueSummaryPdf(reportData: any, sdate: any, eddate: any): void {

        const data: Array<any> = [];
        const date = `Date: ${sdate} to ${eddate}`;

        const headings = ['Week Starting', 'Fee', 'CCS', 'Gap Fee', 'Adjustment Credits', 'Adjustment Debits', 'Hours', 'Total'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        data.push(headers);

        _.forEach(reportData, (record) => {

            if (record.type === 'week') {

                data.push([
                    record.week_start,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.gap),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.credit),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.debit),
                    record.booking_hours.toFixed(2),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.total),
                ]);

            } else {

                data.push([
                    { text: record.week_start, bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.gap), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.credit), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.debit), bold: true },
                    { text: record.booking_hours.toFixed(2), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.total), bold: true },
                ]);


            }

            

        });

        this._pdfService.print('download', headings, data, 'Weekly Revenue Summary Report', date);

    }

    weeklyRevenueSummaryCsv(reportData: any): void {

        const masterRows = [];
        
        _.forEach(reportData, (record) => {

            const row = {
                'Week Starting': record.week_start,
                'Fee': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee),
                'CCS': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs),
                'Gap Fee': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.gap),
                'Adjustment Credits': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.credit),
                'Adjustment Debits': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.debit),
                'Hours': record.booking_hours.toFixed(2),
                'Total': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.total) 
            };

            masterRows.push(row);

        });

        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Weekly Revenue Summary Report');

    }

    // ---------------------------------------------- Opening Balance Report ----------------------------------------------------------//
    getOpeningBalanceReportData(data: any, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/opening-balance-report`, data)
            .pipe(
                map(response =>
                {
                    this.rawReportData = response.data || [];
                    let count = 0;

                    for(const x in this.rawReportData)
                    {
                        if(this.rawReportData[x].adjustment_type === 'credit')
                        {
                            count = count - this.rawReportData[x].open_balance;
                        }
                        else
                        {
                            count = count + this.rawReportData[x].open_balance;
                        }
                        this.rawReportData[x].date  = DateTimeHelper.parseMoment(this.rawReportData[x].date).format('MMM DD, YYYY');
                    }

                    if (view) {
                        // View data
                        this.onOpeningBalanceReportChanged.next({
                            records: response.data || [],
                            total: response.data || {},
                            type: type,
                            requestData: data,
                            totalOfOpeningBalances: count,
                        });

                    } else {

                        if (pdf) {
                            // PDF
                            this.openingBalanceReportPdf(response.data || [], data.sdate, data.edate, count);
                        } else {
                            // Csv
                            this.openingBalanceReportCsv(response.data || [], count);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    openingBalanceReportPdf(reportData: any, sdate: any, eddate: any, total: any): void {

        const openingBalanceReportData: Array<any> = [];
        const date = `Opening Balance Report from  ${sdate} to ${eddate}`;

        const headings = ['Date', 'Parent', 'Description', 'Adjustment Type', 'Amount'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val,
                color: '#ffffff',
                fillColor: '#009fe9'
            };
        });

        openingBalanceReportData.push(headers);

        _.forEach(reportData, (record) => {

            openingBalanceReportData.push([
                record.date,
                record.parent.full_name,
                record.description,
                record.adjustment_type,
                new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.open_balance),
            ]);


        });


        const pageTitle = 'Opening Balance Report';
        const pageType = 'A4';
        const isLandscape = headings.length > 8 ?  true : false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: date, style: 'date' },
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: [65 ,110,170, 100, 80],
                    body: openingBalanceReportData
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            },
            { text: 'Total of Opening balances : ' + new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(total), style: 'subheader'}
        ];

        const styles = {
            header: {
                fontSize: 21,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 12,
                // margin: [0, 10, 0, 0],
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 14,
                bold: false,
                margin: [0, 10, 0, 5]
            },
        };


        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });

    }


    openingBalanceReportCsv(reportData: any, count: any): void {

        const masterRows = [];

        _.forEach(reportData, (record) => {

            const rows = {
                'Date' : record.date,
                'Parent' : record.parent.full_name,
                'Description': record.description,
                'Adjustment Type' : record.adjustment_type,
                'Amount' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.open_balance),
            };

            masterRows.push(rows);

        });
        masterRows.push({
            'Parent' : 'Total of Opening balances',
            'Description': '',
            'Adjustment Type' : '',
            'Amount' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(count),
        });

        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Opening Balance Report');

    }

    // ----------------------------------------------Projected Weekly Revenue Summary Report----------------------------------------------//

    getProjectedWeeklyRevenueSummaryReportData(data: any, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/projected-weekly-revenue-summary-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data || [],
                            total: response.data || {},
                            type: type,
                            requestData: data
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.projectedWeeklyRevenueSummaryPdf(response.data || [], data.sdate, data.edate);
                        } else {
                            // Csv
                            this.projectedWeeklyRevenueSummaryCsv(response.data || []);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    projectedWeeklyRevenueSummaryPdf(reportData: any, sdate: any, eddate: any): void {

        const data: Array<any> = [];
        const date = `Date: ${sdate} to ${eddate}`;

        const headings = ['Room', 'Week Starting', 'Fee', 'CCS'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        data.push(headers);

        _.forEach(reportData, (record) => {

            if (record.type === 'week') {

                data.push([
                    record.room_name || '',
                    record.week_start,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs)
                ]);

            } else {

                data.push([
                    { text: record.room_name || '', bold: true },
                    { text: record.week_start, bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs), bold: true }
                ]);


            }

            

        });

        this._pdfService.print('download', headings, data, 'Projected Weekly Revenue Summary Report', date);

    }

    projectedWeeklyRevenueSummaryCsv(reportData: any): void {

        const masterRows = [];
        
        _.forEach(reportData, (record) => {

            const row = {
                'Room': record.room_name || '',
                'Week Starting': record.week_start,
                'Fee': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee),
                'CCS': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs)
            };

            masterRows.push(row);

        });

        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Projected Weekly Revenue Summary Report');

    }

    // ----------------------------------------------Gap Fee Report----------------------------------------------//

    getGapFeeReportData(data: any, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/gap-fee-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data || [],
                            total: response.data || {},
                            type: type,
                            requestData: data
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.gapFeeReportPdf(response.data || [], data.sdate, data.edate);
                        } else {
                            // Csv
                            this.gapFeeReportCsv(response.data || []);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    gapFeeReportPdf(reportData: any, sdate: any, eddate: any): void {

        const data: Array<any> = [];
        const date = `Date: ${sdate} to ${eddate}`;

        const headings = ['Parent', 'Children', 'Booking Fee', 'CCS Estimate', 'CCS/ACCS Payment', 'Gap Fee'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        data.push(headers);

        _.forEach(reportData, (record) => {

            if (record.type === 'data') {

                data.push([
                    record.name,
                    record.children,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.estimate),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs),
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.gap_fee)
                ]);

            } else {

                data.push([
                    { text: record.name, bold: true },
                    { text: record.children, bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.estimate), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs), bold: true },
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.gap_fee), bold: true }
                ]);


            }

            

        });

        this._pdfService.print('download', headings, data, 'Gap Fee Report', date);

    }

    gapFeeReportCsv(reportData: any): void {

        const masterRows = [];
        
        _.forEach(reportData, (record) => {

            const row = {
                'Parent': record.name,
                'Children': record.children,
                'Booking Fee': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.fee),
                'CCS Estimate': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.estimate),
                'CCS/ACCS Payment': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.ccs),
                'Gap Fee': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.gap_fee)
            };

            masterRows.push(row);

        });

        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Gap Fee Report');

    }

    // ----------------------------------------------Banking Summary Report----------------------------------------------//

    getBankingSummaryReportData(data: any, type: string, view?: boolean, pdf?: boolean): Observable<any> {

        this.reportType = data['type'];
        this.onTableLoaderChanged.next(true);

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/banking-summary-report`, data)
            .pipe(
                map(response => 
                {

                    if (view) {
                        // View data
                        this.onReportChanged.next({
                            records: response.data || null,
                            type: type,
                            requestData: data
                        });

                    } else {
                        
                        if (pdf) {
                            // PDF
                            this.bankingReportPdf(response.data, data.sdate, data.edate);
                        } else {
                            // Csv
                            this.bankingReportCsv(response?.data?.list || []);
                        }

                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );

    }

    bankingReportPdf(reportData: any, sdate: any, eddate: any): void {

        const listData: Array<any> = [];
        const category = reportData.totals;
        const date = sdate != eddate ?  `Date: From ${sdate} to ${eddate}` : `Date: ${sdate}`;

        const headings = ['Parent Name', 'Payment Date', 'Settlement Date', 'Reference Number', 'Type', 'Amount'];

        const headers = _.map(headings, (val)=>{
            return {
                text: val, 
                color: '#ffffff', 
                fillColor: '#009fe9'
            };
        });

        listData.push(headers);

        _.forEach(reportData.list, (record) => {

            if (record.type === 'total') {

                listData.push([
                    { text: record.parent_name, bold: true },
                    '',
                    '',
                    '',
                    '',
                    { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.amount), bold: true }
                ]);

            } else {

                listData.push([
                    record.parent_name,
                    record.date,
                    record.settlement_date,
                    record.transaction_reference,
                    record.type_description,
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.amount),
                ]);

            }

        });

        const pageTitle = 'Banking Summary Report';
        const pageType = 'A4';
        const isLandscape = headings.length > 8 ?  true : false;
        const content = [
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            { text: date, style: 'date' },
            { text: `Date Context: Payment Date`, style: 'meta' },
            { text: `Created On: ${DateTimeHelper.now('YYYY-MM-DD')}`, style: 'meta' },
            {text: 'Totals', style: 'subheader'},
            {
                columns: [
                  {
                    stack: [
                        'Cash Receipted',
                        'EFTPOS Receipted',
                        'Cheques Receipted',
                        'Direct Deposit Receipted',
                        'Credit Card Receipted',
                        'Direct Debit Receipted',
                        'BPAY Receipted',
                        { text: 'Total Receipted', bold: true },
                    ],
                    style: 'meta'
                  },
                  {
                    stack: [
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(category.cash || 0),
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(category.fpos || 0),
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(category.cheque || 0),
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(category.direct_deposit || 0),
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(category.card || 0),
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(category.direct_debit || 0),
                        new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(category.bpay || 0),
                        { text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(category.total), bold: true }
                    ],
                    style: 'categoryvalue',
                  },
                  {},
                  {}
                ]
            },
            {text: 'Detail List', style: 'subheader'},
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: _.fill(new Array(headings.length), 'auto'),
                    body: listData
                },
                layout: {
                    defaultBorders: false,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node)  => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 0 : 1,
                    vLineWidth: (i, node)  => 0,
                    hLineColor: (i, node)  => (i === 0 || i === 1 || i === node.table.body.length) ? null : '#f4f4f4',
                    vLineColor: (i, node)  => null
                },
                style: 'table'
            }
        ];

        const styles = {
            header: {
                fontSize: 21,
                margin: [0 , 0, 0, 8],
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            meta: {
                fontSize: 12,
                margin: [0 ,0 , 0, 8]
            },
            categoryvalue: {
                fontSize: 12,
                margin: [0 ,0 , 0, 8],
                alignment: 'right'
            },
            table: {
                fontSize: 12,
                // margin: [0, 10, 0, 0],
                margin: [0, 5, 0, 15]
            },
            logo: {
                alignment: 'right',
                margin: [0, -35, 0, 0]
            },
            subheader: {
                fontSize: 16,
                bold: false,
                margin: [0, 10, 0, 5],

            },
        };


        this._pdfHelperService
            .generatePDF('download', isLandscape, pageType, pageTitle, content, styles, _.snakeCase(_.toLower(pageTitle)))
            .catch(error => { throw error; });

    }

    bankingReportCsv(reportData: any): void {

        const masterRows = [];
        
        _.forEach(reportData, (record) => {

            const row = {
                'Parent': record.parent_name,
                'Payment Date': record.date,
                'Settlement Date': record.settlement_date,
                'Reference Number': record.transaction_reference,
                'Type': record.type_description,
                'Amount': new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.amount)
            };

            masterRows.push(row);

        });

        const csvData = this.objectToCsv(masterRows);

        this._csvService.downLoadCsvFile(csvData, 'Banking Summary Report');

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

    makeCsvData(data: any[]): string {
        return data.map((e: any) => {
            return e.map((val: any) => {
                if (val) {
                    return val.toString().replace(/[",]/g, '');
                } else {
                    return val;
                }
            }).join(',');
        }).join('\n');
    }

    getCurrentDate():any {
        const currentdate = new Date();
        return  currentdate.getDate() + '/' + (currentdate.getMonth() + 1) + '/' + currentdate.getFullYear();
    }

    getUsers(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {

            const params = new HttpParams()
                .set('filters', JSON.stringify(this.filterBy));

            this.onUserLoaderChanged.next(true);

            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-finance-report-users`, { params })
                .pipe(
                    finalize(() => {
                        this.onUserLoaderChanged.next(false);
                    }),
                    map((response: any) => {
                        this.userAccounts = response.data.map((i: any, idx: number) => new User(i, idx));
                        this.onUserAccountsChanged.next([...this.userAccounts]);
                        return this.userAccounts;
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>  resolve(response),
                    reject
                );
            
        });
    }

    getAgedDebtorsFields(): any {
        
        const fields = [
            {
                name: 'Full Name',
                result: 'full_name'
            },
            {
                name: 'Children',
                result: 'children'
            },
            {
                name: 'Last Payment Date',
                result: 'last_payment_date'
            },
            {
                name: 'Next Payment Date',
                result: 'next_payment_date'
            },
            {
                name: 'Total Owing',
                result: 'balance'
            },
            {
                name: 'Days Overdue',
                result: 'days_overdue'
            },
        ];

        return fields;
    }

    getReportTypes(): FinanceReportType[] {
        return [
            {
                name: 'Account Balance Report',
                value: AppConst.financeReportTypes.ACCOUNT_BALANCE_REPORT
            },
            {
                name: 'Aged Debtors Report',
                value: AppConst.financeReportTypes.AGED_DEBTORS_REPORT
            },
            {
                name: 'Income Summary Report',
                value: AppConst.financeReportTypes.INCOME_SUMMARY_REPORT
            },
            {
                name: 'Transaction Summary Report',
                value: AppConst.financeReportTypes.TRANSACTION_LISTING_REPORT
            },
            {
                name: 'Weekly Revenue Summary Report',
                value: AppConst.financeReportTypes.WEEKLY_REVENUE_SUMMARY_REPORT
            },
            {
                name: 'Bond Report',
                value: AppConst.financeReportTypes.BOND_REPORT
            },
            {
                name: 'Opening Balance Report',
                value: AppConst.financeReportTypes.OPENING_BALANCE_REPORT
            },
            {
                name: 'Financial Adjustments',
                value: AppConst.financeReportTypes.FINANCIAL_ADJUSTMENT
            },
            {
                name: 'Projected Weekly Revenue Summary Report',
                value: AppConst.financeReportTypes.PROJECTED_WEEKLY_REVENUE_SUMMARY_REPORT
            },
            {
                name: 'Gap Fee Report',
                value: AppConst.financeReportTypes.GAP_FEE_REPORT
            },
            {
                name: 'Banking Summary Report',
                value: AppConst.financeReportTypes.BANKING_SUMMARY_REPORT
            }
        ];
    }

    setEvents(): void {

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                this.filterBy = filter;
                this.getUsers();
            });

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
        this.filterBy = {...this.defaultFilter};

        this.onReportChanged.next([]);
        this.totalRecords = 0;
    }

}

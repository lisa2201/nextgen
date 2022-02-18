import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject, of, forkJoin } from 'rxjs';
import { shareReplay, map, finalize, takeUntil, switchMap, first, single } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from 'app/shared/AppConst';

import { PaginationProp } from 'app/shared/interface/pagination';
import { Supplier } from '../model/supplier.model';
import { CategoryService } from './category.service';
import { AuthService } from 'app/shared/service/auth.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { PDFHelperService } from 'app/shared/service/pdf-helper.service';
import { Receipt } from '../model/receipt.model';
import { Reimbursement } from '../model/reimbursements.model';
import { parseISO } from 'date-fns';

@Injectable()
export class SupplierService implements Resolve<any> {
    
    private _unsubscribeAll: Subject<any>;

    private supplier: Supplier[];
    receipt: Receipt[];
    reimbursement: Reimbursement[];

    onReimbursementChanged: BehaviorSubject<any>;

    onReceiptChanged: BehaviorSubject<any>;

    onSupplierChanged: BehaviorSubject<any>;
    onReportChanged: BehaviorSubject<any>;

    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onReportViewLoaderChanged: Subject<any>;

    paginationMeta: any;
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
    currentPageIndex: any = 1;

    /**
     * Constructor
     *
     * @param {AuthService} _authService
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {BranchService} _branchService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        // private _categoryService: CategoryService,
        private _authService: AuthService,
        private _pdfHelperService: PDFHelperService,
    )
    {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;
        this.paginationMeta = null;

        this.onSupplierChanged = new BehaviorSubject([]);
        this.onReportChanged = new BehaviorSubject([]);
        this.onReceiptChanged = new BehaviorSubject([]);
        this.onReimbursementChanged = new BehaviorSubject([]);

        this.onPaginationChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onReportViewLoaderChanged = new Subject();
        

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
        return new Promise<void>((resolve, reject) =>
        {
            Promise.all([
                this.getReceipt(),
                this.getReimbursement()
            ])
            .then(([receipt,reimburs]: [any,any]) => 
            {
                
                this.setEvents();

                resolve();
            })
            .catch(errorResponse => 
            {

                reject(errorResponse);
            });

            if(this._authService.canAccess(['AC0'], 'N64')){
                forkJoin([
                    this.getSupplier(),
                ])
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(([supplier]: [any]) =>
                    {
                        this.setEvents();
                        resolve();
                    }, reject);
            }
            // if(this._authService.canAccess(['AC0'], 'N65')){
            //     forkJoin([
            //         this._categoryService.resolve(null, null)
            //     ])
            //         .pipe(takeUntil(this._unsubscribeAll))
            //         .subscribe(() =>
            //         {
            //             this.setEvents();
            //             resolve();
            //         }, reject);
            // }
            
            
            if (this._authService.canAccess(['AC0'], 'N63')) {
                
                    this.getReportPdf(null, false)
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(() => {
                        resolve();
                    }, reject);
            }
            
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
                this.getSupplier();
            });


        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {

                this.pagination = pagination;
                this.getSupplier();
            });

            
    }


    getPaginationOptions(): any {
        return this.pagination;
    }

    /**
     * Get user list on resolve
     *
     * @returns {Observable<any>}
     */
    getSupplier(): Promise<any>
    {
        // set table loader
        this.onViewLoaderChanged.next(true);

        // set default value
        if (_.isNull(this.pagination))
        {
            this.pagination = {
                page: this.currentPageIndex,
                size: this.defaultPageSize
            };
        }
       
        let params = new HttpParams()
            .set('page', this.pagination.page)
            .set('offset', this.pagination.size)
            .set('search', this.searchText);
            
        return new Promise((resolve, reject) => 
        {
            return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-supplier-list`, {params})
            .pipe(
                map(response =>{
                    this.onViewLoaderChanged.next(false);
                    this.supplier = response.data.map((i: any, idx: number) => new Supplier(i, idx));

                    this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                    this.totalRecords = response.totalRecords;
                    this.isFiltered = response.filtered;

                    this.onSupplierChanged.next(
                        {
                            items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.supplier],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        });

                    return {
                        items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.supplier],
                        totalDisplay: this.totalDisplayRecords,
                        total: this.totalRecords,
                        filtered: this.isFiltered
                    };
                }),
                shareReplay()
            )
            .subscribe(
                (response: any) => {
                    resolve(response),
                    reject
                }
            );
        });
            
    }

    getAllSupplier(withTrashed: string): Promise<any>
    {
        let params = new HttpParams()
        .set('withTrashed', withTrashed);
        return new Promise((resolve, reject) => 
        {
            return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-suppliers`, {params})
            .pipe(
                map(response =>{

                    return response.data.map((i: any, idx: number) => new Supplier(i, idx));

                }),
                shareReplay()
            )
            .subscribe(
                (response: any) => {
                    resolve(response),
                    reject
                }
            );
        });
    
    }

    storeSupplier(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-supplier`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    
                    this.getSupplier();

                    return response;
                }),
                shareReplay()
            );
    }

    
    updateSupplier(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-supplier`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    
                    this.getSupplier();
                    this.getReportPdf(null, false).subscribe();
                    return response;
                }),
                shareReplay()
            );
    }

    deleteSupplier(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-supplier`, { params })
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getSupplier();
                    
                    return response.message;
                }),
                shareReplay()
            );
    }

    getReportPdf(data: object = null, isPdf: boolean): Observable<any> {

        if(!isPdf) {
            this.onReportViewLoaderChanged.next(true)
        }
        
        if(data === null){
                let dateArray = [
                    {
                        'start_date':null,
                        'end_date': null
                    }
                ];
                data = dateArray[0];
        }

            const params = new HttpParams().set('start_date', data['start_date'])
            .set('end_date', data['end_date'])
            .set('type', isPdf? 'PDF' : 'VIEW');

        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/petty-cash-report-data`, { params })
            .pipe(
                map(response => {

                    this.onReportViewLoaderChanged.next(false);

                    if (isPdf) {
                        if (response.data && response.data['list'].length > 0) {

                            this.getReportDownload(response.data['list'],response.data['category_data'], data['start_date'], data['end_date']);
                            // return response.message;
                        }
                        else{
                            return 'No data found';
                        }

                    }
                    else {

                        this.onReportChanged.next({
                            item:  response.data['list'],
                            start_date: data['start_date'],
                            end_date: data['end_date']
                        });
                        // return response.message;

                    }
                }),
                shareReplay()
            );
    }

    creditTotal(reportData: any, credit: boolean): number{
        let total = 0;

            _.forEach(reportData,  (data)=> {
                if(credit){
                    total += data.credit? parseFloat(data.credit) : 0
                }
                else{
                    total += data.debit? parseFloat(data.debit) : 0
                }
            });
        
        
        return total;
       
        

    }

    getFormatedDate(date: string) {

        return date? DateTimeHelper.getUtcDate(parseISO(date), 'DD-MM-YYYY'): 'N/A';
    }

    getReportDownload(reportData: any, categoryData:any,  sDate, eDate){

        let receiptData = _.filter(reportData, {type: "RECEIPT"});
        let mapData = _.map(receiptData, v=>{
            return {
                ...v,
                ...{category_name: v.data.category.name,supplier_name: v.data.supplier.name}
            };
        });

        // console.log('mapData',mapData);

        let groupData = _.groupBy(mapData, 'category_name');

        // console.log('groupData',groupData);
        
        
        const data: Array<any> = [];
        // data.push([{text: `Petty Cash GST Summary ${sDate} to ${eDate}`, color: '#ffffff',fillColor: '#009fe9', colSpan: 5, alignment: 'center'}, {},{},{},{}]);
        const headings = ['Date', 'Note', 'Category', 'Supplier', 'GST', 'Total', 'Reimburse', 'Balance'];
        
        const headers = _.map(headings, (val)=>{
            return {
                text: val,
                fillColor: '#CCCCCC'
            };
        });

        data.push(headers);

        _.forEach(reportData, (record) => {

            let arr = [];

            if(record.desc === 'opening_balance'){
                arr = [
                    this.getFormatedDate(record.date),
                    'Balance carried forward',
                    '',
                    '',
                    '',
                    '',
                    '',
                    new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.balance),
                ]
            }
            else{
                arr = [
                    this.getFormatedDate(record.date),
                    record.desc,
                    record.data?(record.data.category)? record.data.category.name: '' : '',
                    record.data? (record.data.supplier)? record.data.supplier.name: '' : '',
                    record.gst_amount ?new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.gst_amount)  : '',
                    record.debit === null ? '' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.debit),
                    record.credit === null ? '' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.credit),
                    record.balance === null ? '' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.balance),
                    
                ];
            }
               
            data.push(arr);

        });

       
        let arr = [];
        arr = [
            {text: ''},
            {text: 'Total',bold: true},
            {text: ''},
            {text: ''},
            {text: ''},
            {text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(this.creditTotal(reportData, false)),bold: true},
            {text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(this.creditTotal(reportData, true)),bold: true},
            {text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(this.creditTotal(reportData,false) - this.creditTotal(reportData, true)),bold: true},
        ]

        data.push(arr);

        const pageTitle = `Petty Cash GST Summary ${this.getFormatedDate(sDate)} to ${this.getFormatedDate(eDate)}`;
        const pageType = 'A4';
        const isLandscape = headings.length > 8 ?  true : false;
        let content = [
            { text: this._authService.isAdmin() || this._authService.isOwner() ? '' :  this._authService.getClient().name, style: 'company' },
            { text: pageTitle, style: 'header' },
            { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
            
            {
                table: {
                    headerRows: 1,
                    keepWithHeaderRows: true,
                    dontBreakRows: true,
                    widths: _.fill(new Array(headings.length), 'auto'),
                    body: data
                },
                layout: {
                    defaultBorders: true,
                    paddingLeft: (i, node) => 4,
                    paddingRight: (i, node) => 4,
                    paddingTop: (i, node) => 4,
                    paddingBottom: (i, node) => 4,
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                    vLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                    hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                    vLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                },
                style: 'table'
            },
            { text: 'Petty Cash Breakdown By Category', style: 'categoryHeaderMain'},

        ];

        // print petty cash broken by category
       

        for (const categoryName in groupData) {

            const categoryHeadings = ['Date', 'Supplier', 'Description', 'ex GST', 'GST', 'inc GST'];
            const categoryHeaders = _.map(categoryHeadings, (val) => {
                return {
                    text: val,
                    fillColor: '#CCCCCC'
                };
            });

            let categoryTableData: Array<any> = [];

            categoryTableData.push(categoryHeaders);

            for (let record of groupData[categoryName]) {

                // console.log(record);
                

                let singleObject = [
                    this.getFormatedDate(record.date) || '',
                    record.supplier_name || '',
                    record.desc||'',
                    record.cost === null ? '' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.cost),
                    record.gst_amount === null? '' : new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(parseFloat(record.gst_amount)),
                    record.debit === null? '' :  new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(record.debit),
                ];

                categoryTableData.push(singleObject);

            }

            let totalLine = [
                {text: ''},
                {text:'Total', bold:true},
                {text: ''},
                {text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(this.getSumOfCayegoryData(groupData[categoryName], true)), bold: true},
                {text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(this.getSumOfCayegoryData(groupData[categoryName], false) - this.getSumOfCayegoryData(groupData[categoryName], true))},
                {text: new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' }).format(this.getSumOfCayegoryData(groupData[categoryName], false)), bold:true},
            ]

            categoryTableData.push(totalLine);
            
            content.push(
                { text: categoryName, style: 'categoryHeader'},

                { canvas: [ { type: 'line', x1: 0, y1: 0, x2: this._pdfHelperService.getPageSize(isLandscape, pageType).width - 40, y2: 0, lineWidth: 1 } ]},
                {
                    table: {
                        widths: ['auto', 'auto', '*','auto','auto','auto'],
                        headerRows: 1,
                        keepWithHeaderRows: true,
                        dontBreakRows: true,
                        body: categoryTableData
                    },
                    layout: {
                        defaultBorders: true,
                        paddingLeft: (i, node) => 4,
                        paddingRight: (i, node) => 4,
                        paddingTop: (i, node) => 4,
                        paddingBottom: (i, node) => 4,
                        hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                        vLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.widths.length || i === node.table.body.length) ? 1 : 1,
                        hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                        vLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? '#f4f4f4' : '#f4f4f4',
                    },
                    style: 'categorTyable'
                }
            );
        }


        const styles = {
            header: {
                fontSize: 21,
                alignment: 'center',
                margin: [0 , 0, 0, 8],
            },
            categoryHeader:{
                fontSize: 18,
                alignment: 'center',
                margin: [0 , 0, 0, 8],
            },
            categoryHeaderMain:{
                fontSize: 20,
                alignment: 'center',
                margin: [0 , 20, 0, 2],
            },
            company:{
                fontSize: 21,
                margin: [0 , 0, 0, 8],
                alignment: 'center'
            },
            date: {
                fontSize: 12,
                margin: [0 ,8 , 0, 0],
                color: '#969696'
            },
            table: {
                fontSize: 8,
                margin:[ 50, 8, 0, 0],
            },
            categorTyable:{
                fontSize: 8,
                margin:[ 50, 8, 65, 20],
                // width: [45, 60, 95, 57, 57, 58],
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

    getSumOfCayegoryData(reportData: any, isCost: boolean): number {

        let total = 0;

        _.forEach(reportData, (data) => {
            if (isCost) {
                total += data.cost ? parseFloat(data.cost) : 0
            }
            else {
                total += data.debit ? parseFloat(data.debit) : 0
            }
        });


        return total;

    }
    /**
     * Unsubscribe options
     */
    unsubscribeOptions(rememberLastOptions: boolean = false): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize
        this._unsubscribeAll = new Subject();

        // reset all variables
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;

        if (!rememberLastOptions)
        {
            this.clearLastRememberOptions();
        }
    }

    /**
     * clear all last remembered options
     */
    clearLastRememberOptions(): void
    {
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

    // Receipt
    getReceipt(): Promise<any>
    {
        // set table loader
        this.onViewLoaderChanged.next(true);

        // set default value
        if (_.isNull(this.pagination))
        {
            this.pagination = {
                page: this.currentPageIndex,
                size: this.defaultPageSize
            };
        }
       
        let params = new HttpParams()
            .set('page', this.pagination.page)
            .set('offset', this.pagination.size)
            .set('search', this.searchText);
            
        return new Promise((resolve, reject) => 
        {
            return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-receipt-list`, {params})
            .pipe(
                map(response =>{
                    this.onViewLoaderChanged.next(false);
                    this.receipt = response.data.map((i: any, idx: number) => new Receipt(i, idx));

                    this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                    this.totalRecords = response.totalRecords;
                    this.isFiltered = response.filtered;

                    this.onReceiptChanged.next(
                        {
                            items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.receipt],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        });

                    return {
                        items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.receipt],
                        totalDisplay: this.totalDisplayRecords,
                        total: this.totalRecords,
                        filtered: this.isFiltered
                    };
                }),
                shareReplay()
            )
            .subscribe(
                (response: any) => {
                    resolve(response),
                    reject
                }
            );
        });
    
    }

    storeReceipt(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-receipt`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    
                    this.getReceipt();
                    this.getReportPdf(null, false).subscribe();

                    return response;
                }),
                shareReplay()
            );
    }

    
    updateReceipt(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-receipt`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    this.getReceipt();
                    this.getReportPdf(null, false).subscribe();

                    return response;
                }),
                shareReplay()
            );
    }

    deleteReceipt(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-receipt`, { params })
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getReportPdf(null, false).subscribe();
                    
                    return response.message;
                }),
                shareReplay()
            );
    }

    // Reibursement 

    getReimbursement(): Promise<any>
    {
        // set table loader
        this.onViewLoaderChanged.next(true);

        // set default value
        if (_.isNull(this.pagination))
        {
            this.pagination = {
                page: this.currentPageIndex,
                size: this.defaultPageSize
            };
        }
       
        let params = new HttpParams()
            .set('page', this.pagination.page)
            .set('offset', this.pagination.size)
            .set('search', this.searchText);
            
        return new Promise((resolve, reject) => 
        {
            return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-reimbursement-list`, {params})
            .pipe(
                map(response =>{
                    this.onViewLoaderChanged.next(false);
                    this.reimbursement = response.data.map((i: any, idx: number) => new Reimbursement(i, idx));

                    this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                    this.totalRecords = response.totalRecords;
                    this.isFiltered = response.filtered;

                    this.onReimbursementChanged.next(
                        {
                            items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.reimbursement],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        });

                    return {
                        items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.reimbursement],
                        totalDisplay: this.totalDisplayRecords,
                        total: this.totalRecords,
                        filtered: this.isFiltered
                    };
                }),
                shareReplay()
            )
            .subscribe(
                (response: any) => {
                    resolve(response),
                    reject
                }
            );
        });
    
    }

    storeReimbursement(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-reimbursement`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getReimbursement();
                    this.getReportPdf(null, false).subscribe();
                    return response;
                }),
                shareReplay()
            );
    }

    
    updateReimbursement(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-reimbursement`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    this.getReimbursement();
                    this.getReportPdf(null, false).subscribe();

                    return response;
                }),
                shareReplay()
            );
    }

    deleteReimbursement(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-reimbursement`, { params })
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getReportPdf(null, false).subscribe();
                    
                    return response.message;
                }),
                shareReplay()
            );
    }
}

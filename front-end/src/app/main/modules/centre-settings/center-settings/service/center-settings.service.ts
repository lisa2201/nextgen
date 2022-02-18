import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, map, takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';
import { UrlHelper } from 'app/utils/url.helper';

@Injectable()
export class CenterSettingsService {

    onCenterSettingsChanged: BehaviorSubject<any>;

    onValueChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    actualTotal: number;
    displayTotal: number;
    validDataCount: boolean;
    branchDetails: any;
    apiData: any;
    routeParams: any;
    private _unsubscribeAll: Subject<any>;
    centerSettingData:any;

    filterBy: any = '0';
    filterData: BehaviorSubject<any>;
    eventsSet: boolean;

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

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param _auth
     */
    constructor(
        private _httpClient: HttpClient, 
        private _logger: NGXLogger, 
        private _auth: AuthService
    ) 
    {
        // Set the defaults
        this.onCenterSettingsChanged = new BehaviorSubject([]);

        this.onValueChanged = new BehaviorSubject([]);
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
        this.defaultPageSize = 5;
        this.onPageSizeChanged = new Subject();
        this.currentPage = this.defaultPageIndex;
        this.currentPageSize = this.defaultPageSize;

        this.centerSettingData = [];

        /*filter */
        this.filterData = new BehaviorSubject(null);
        this.eventsSet = false;

        this.serverErrors = null;

        this.pageData = new BehaviorSubject({ currentPage: this.defaultPageIndex, lastPage: this.lastPage, pageSize: this.defaultPageSize });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    changeMessage(message: any): void 
    {
        this.messageSource.next(message);
    }

    businessInfo(businessInfo: object): Observable<any> 
    {
        this.branchDetails = this._auth.getClient();

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-business-info`, businessInfo )
            .pipe(
                map(response => response),
                shareReplay()
            );
    }

    setBusinessInfo(businessInfo: object): Observable<any> 
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-business-info`, businessInfo )
            .pipe(
                map((response) => response),
                shareReplay()
            );
    }

    setEvents(): void {

        this.onValueChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter => {
                // this.filterBy = filter;
                // this.filterData.next(filter);
                // this.resetPagination();
                this.setBusinessInfo(null);
            });

        this.eventsSet = true;
    }

    getClientInformation(): Promise<void>
    {
        const params = new HttpParams().set('domain', UrlHelper.extractTenantNameFromUrl(location.host));

        return new Promise((resolve, reject) => 
        {
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/verify-org`, { params: params })
                .pipe(
                    map(response => response.data),
                    shareReplay()
                ).subscribe(
                    (response: any) => {

                        this.onCenterSettingsChanged.next(response);

                        resolve();
                    },
                    reject
                );
        });
    }

    setBusinessLogo(businessLogo: object): Observable<any> 
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-business-logo`, businessLogo )
            .pipe(
                map((response) => {
                    this._auth.getClientInformation();

                    return response;
                })
            );
    }
}

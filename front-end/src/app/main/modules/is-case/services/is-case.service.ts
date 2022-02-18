import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { take, map, finalize, shareReplay, takeUntil } from 'rxjs/operators';
import { ISCase, MinimumEducatorMap } from '../is-case.model';
import { Child } from '../../child/child.model';
import { User } from '../../user/user.model';
import * as moment from 'moment';
import { ISCaseClaim, ISCaseClaimResponse } from '../is-case-claim.model';
import { ISCaseClaimSubmission } from '../is-case-claim-submission.model';

interface PageDataObject {
    currentPage: number;
    pageSize: number;
    lastPage: boolean;
}

@Injectable()
export class IsCaseService {

    // -----------------------------------------------------------------------------------------------------
    // Common
    // -----------------------------------------------------------------------------------------------------

    defaultPageIndex: number;
    defaultPageSize: number;
    defaultPageSizeOptions: number[] = [5, 10, 20];

    // -----------------------------------------------------------------------------------------------------
    // IS Cases
    // -----------------------------------------------------------------------------------------------------
    
    private _unsubscribeAll: Subject<any>;
    private isCases: ISCase[];
    onISCasesChanged: BehaviorSubject<any>;
    onISCaseDetailChanged: BehaviorSubject<any>;
    onTableLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;
    onISCaseQueryByFilter: Subject<any>;
    onPageSizeChanged: Subject<any>;
    pageData: BehaviorSubject<PageDataObject>;
    filterData: BehaviorSubject<any>;
    currentPage: any;
    currentPageSize: any;
    lastPage: boolean;
    filterBy: any | null = null;
    eventsSet: boolean;

    // -----------------------------------------------------------------------------------------------------
    // IS Case Claims
    // -----------------------------------------------------------------------------------------------------

    private _unsubscribeAllISClaims: Subject<any>;
    private isCaseClaims: ISCaseClaim[];
    onISCaseClaimsChanged: BehaviorSubject<any>;
    onISCaseClaimsDetailChanged: BehaviorSubject<any>;
    onISCaseClaimsTableLoaderChanged: Subject<any>;
    onISCaseClaimsFilterChanged: Subject<any>;
    onISCaseClaimsQueryByFilter: Subject<any>;
    onISCaseClaimsPageSizeChanged: Subject<any>;
    isCaseClaimsPageData: BehaviorSubject<PageDataObject>;
    isCaseClaimsFilterData: BehaviorSubject<any>;
    isCaseClaimsCurrentPage: any;
    isCaseClaimsCurrentPageSize: any;
    isCaseClaimsLastPage: boolean;
    isCaseClaimsFilterBy: any | null = null;
    isCaseClaimsEventsSet: boolean;

    // -----------------------------------------------------------------------------------------------------
    // IS Case Claim Submissions
    // -----------------------------------------------------------------------------------------------------

    private _unsubscribeAllISClaiSubmissions: Subject<any>;
    private isCaseClaimSubmissions: ISCaseClaimSubmission[];
    onISCaseClaimSubmissionsChanged: BehaviorSubject<any>;
    onISCaseClaimSubmissionsPaginationChanged: Subject<any>;
    onISCaseClaimSubmissionsSearchTextChanged: Subject<any>;
    onISCaseClaimSubmissionsSortChanged: Subject<any>;
    onISCaseClaimSubmissionsTableLoaderChanged: Subject<any>;
    isCaseClaimSubmissionsTotalRecords: number;
    isCaseClaimSubmissionsTotalDisplayRecords: number;
    isCaseClaimSubmissionsPagination: any | null = null;
    isCaseClaimSubmissionsSortBy: any | null = null;
    isCaseClaimSubmissionsSearchText: string | null = null;
    isCaseClaimSubmissionsFilterBy: any | null = null;
    onISCaseClaimSubmissionsFilterChanged: Subject<any>;

    constructor(private _httpClient: HttpClient) {

        // Set the defaults
        this.defaultPageIndex = 1;
        this.defaultPageSize = 5;
        
        // IS Case
        this._unsubscribeAll = new Subject();
        this.onISCasesChanged = new BehaviorSubject([]);
        this.onISCaseDetailChanged = new BehaviorSubject({});
        this.pageData = new BehaviorSubject({ currentPage: this.defaultPageIndex, lastPage: this.lastPage, pageSize: this.defaultPageSize });
        this.lastPage = true;
        this.eventsSet = false;
        this.filterData = new BehaviorSubject(null);
        this.currentPage = this.defaultPageIndex;
        this.currentPageSize = this.defaultPageSize;
        this.onFilterChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onPageSizeChanged = new Subject();
        this.onISCaseQueryByFilter = new Subject();

        // IS Case Claim
        this._unsubscribeAllISClaims = new Subject();
        this.onISCaseClaimsChanged = new BehaviorSubject([]);
        this.onISCaseClaimsDetailChanged = new BehaviorSubject({});
        this.isCaseClaimsPageData = new BehaviorSubject({ currentPage: this.defaultPageIndex, lastPage: this.lastPage, pageSize: this.defaultPageSize });
        this.isCaseClaimsLastPage = true;
        this.isCaseClaimsEventsSet = false;
        this.isCaseClaimsFilterData = new BehaviorSubject(null);
        this.isCaseClaimsCurrentPage = this.defaultPageIndex;
        this.isCaseClaimsCurrentPageSize = this.defaultPageSize;
        this.onISCaseClaimsFilterChanged = new Subject();
        this.onISCaseClaimsTableLoaderChanged = new Subject();
        this.onISCaseClaimsPageSizeChanged = new Subject();
        this.onISCaseClaimsQueryByFilter = new Subject();

        // IS Case Claim Submission
        this._unsubscribeAllISClaiSubmissions = new Subject();
        this.onISCaseClaimSubmissionsChanged = new BehaviorSubject([]);
        this.onISCaseClaimSubmissionsPaginationChanged = new Subject();
        this.onISCaseClaimSubmissionsSearchTextChanged = new Subject();
        this.onISCaseClaimSubmissionsSortChanged = new Subject();
        this.onISCaseClaimSubmissionsTableLoaderChanged = new Subject();
        this.onISCaseClaimSubmissionsFilterChanged = new Subject();
        this.isCaseClaimSubmissionsTotalRecords = 0;
        this.isCaseClaimSubmissionsTotalDisplayRecords = 0;
        this.isCaseClaimSubmissionsPagination = null;
        this.isCaseClaimSubmissionsSortBy = null;
        this.isCaseClaimSubmissionsSearchText = null;
        this.isCaseClaimSubmissionsFilterBy = null;

    }

    // -----------------------------------------------------------------------------------------------------
    // Common
    // -----------------------------------------------------------------------------------------------------

    unsubscribeOptions(resetISCases: boolean = true, resetISCaseClaims: boolean = true, resetSubmissions: boolean = true): void {

        if (resetISCases) {
            this.unsubscribeISCaseOptions();
        }

        if (resetISCaseClaims) {
            this.unsubscribeISClaimOptions();
        }

        if (resetSubmissions) {
            this.unsubscribeISCaseClaimSubmissionsOptions();
        }

    }

    // -----------------------------------------------------------------------------------------------------
    // IS Cases
    // -----------------------------------------------------------------------------------------------------

    listISCases(page: number | null): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onTableLoaderChanged.next(true);

            const params = new HttpParams()
                .set('page', page ? page : this.currentPage)
                .set('offset', this.currentPageSize)
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/is-case-list`, { params })
                .pipe(
                    take(1),
                    map(response => {

                        if (response.data && response.data.ListOfISCases && response.data.ListOfISCases.ISCase) {
                            this.isCases = response.data.ListOfISCases.ISCase;
                        } else {
                            this.isCases = [];
                        }

                        if (response.data && response.data.LastPage && response.data.LastPage === 'true') {
                            this.lastPage = true;
                        } else {
                            this.lastPage = false;
                        }

                        // this.isFiltered = response.filtered;

                        return {
                            items: [...this.isCases],
                            lastPage: this.lastPage
                        };
                    }),
                    finalize(() => {
                        setTimeout(() => this.onTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onISCasesChanged.next(response);

                        if (page) {
                            this.currentPage = page;
                        }

                        this.pageData.next({ pageSize: this.currentPageSize, currentPage: this.currentPage, lastPage: this.lastPage });

                        resolve(null);

                    },
                    reject
                );

        });

    }

    getISCase(caseId: string): Promise<any> {

        return new Promise((resolve, reject) => {

            if (!caseId) {
                return reject('IS Case ID not provided');
            }

            const index = _.findIndex(this.isCases, { 'ISCaseId': caseId });

            if (index === -1) {
                this.onISCaseDetailChanged.next({});
                return reject('IS Case not found');
            } else {
                this.onISCaseDetailChanged.next({ ...this.isCases[index] });
                return resolve(null);
            }

        });

    }

    setEvents(): void {

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(data => {
                this.filterBy = data;
                this.filterData.next(data);
                this.resetPagination();
                this.listISCases(null);
            });

        this.onPageSizeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pageSize: number) => {
                this.currentPageSize = pageSize;
            });

        this.eventsSet = true;

    }

    nextPage(): void {
        this.listISCases(this.currentPage + 1);
    }

    previousPage(): void {

        const page = this.currentPage - 1;

        if (!page || page < 1) {
            return;
        }

        this.listISCases(this.currentPage - 1);

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

    resetDetailData(): void {
        this.onISCaseDetailChanged.next({});
    }

    resetListData(): void {
        this.isCases = [];
        this.onISCasesChanged.next({
            items: [],
            lastPage: this.lastPage
        });
    }

    unsubscribeISCaseOptions(resetPagination: boolean = true, resetDetailData: boolean = true, resetList: boolean = true): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        this.eventsSet = false;

        // reset all variables
        this.filterBy = null;
        this.defaultPageSize = 5;
        this.defaultPageIndex = 1;

        this.isCases = [];

        this.filterData.next(null);

        if (resetPagination) {
            this.resetPagination();
        }

        if (resetDetailData) {
            this.resetDetailData();
        }

        if (resetList) {
            this.resetListData();
        }

    }

    // -----------------------------------------------------------------------------------------------------
    // IS Case Claims
    // -----------------------------------------------------------------------------------------------------

    listISCaseClaims(page: number | null): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onISCaseClaimsTableLoaderChanged.next(true);

            const params = new HttpParams()
                .set('page', page ? page : this.isCaseClaimsCurrentPage)
                .set('offset', this.isCaseClaimsCurrentPageSize)
                .set('filters', JSON.stringify(this.isCaseClaimsFilterBy));

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/is-case-claim-list`, { params })
                .pipe(
                    take(1),
                    map((response: {code: number, message: string, data: ISCaseClaimResponse}) => {

                        if (response.data && response.data.ListOfISCaseClaims && response.data.ListOfISCaseClaims.ISCaseClaim) {
                            this.isCaseClaims = response.data.ListOfISCaseClaims.ISCaseClaim;
                        } else {
                            this.isCaseClaims = [];
                        }

                        if (response.data && response.data.LastPage && response.data.LastPage === 'true') {
                            this.isCaseClaimsLastPage = true;
                        } else {
                            this.isCaseClaimsLastPage = false;
                        }

                        return {
                            items: [...this.isCaseClaims],
                            lastPage: this.isCaseClaimsLastPage
                        };
                    }),
                    finalize(() => {
                        setTimeout(() => this.onISCaseClaimsTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onISCaseClaimsChanged.next(response);

                        if (page) {
                            this.isCaseClaimsCurrentPage = page;
                        }

                        this.isCaseClaimsPageData.next({ 
                            pageSize: this.isCaseClaimsCurrentPageSize, 
                            currentPage: this.isCaseClaimsCurrentPage, 
                            lastPage: this.isCaseClaimsLastPage 
                        });

                        resolve(null);

                    },
                    reject
                );

        });

    }

    getISCaseClaim(claimId: string): Promise<any> {
        
        return new Promise((resolve, reject) => {

            if (!claimId) {
                return reject('IS Case Claim ID not provided');
            }

            const index = _.findIndex(this.isCaseClaims, { 'ISCaseClaimId': claimId });

            if (index === -1) {
                this.onISCaseClaimsDetailChanged.next({});
                return reject('IS Case Claim not found');
            } else {
                this.onISCaseClaimsDetailChanged.next({ ...this.isCaseClaims[index] });
                return resolve(null);
            }

        });

    }

    setISClaimEvents(): void {

        this.onISCaseClaimsFilterChanged
            .pipe(takeUntil(this._unsubscribeAllISClaims))
            .subscribe((data) => {
                this.isCaseClaimsFilterBy = data;
                this.isCaseClaimsFilterData.next(data);
                this.isClaimResetPagination();
                this.listISCaseClaims(null);
            });

        this.onISCaseClaimsPageSizeChanged
            .pipe(takeUntil(this._unsubscribeAllISClaims))
            .subscribe((pageSize: number) => {
                this.isCaseClaimsCurrentPageSize = pageSize;
            });

        this.isCaseClaimsEventsSet = true;

    }

    isClaimNextPage(): void {
        this.listISCaseClaims(this.isCaseClaimsCurrentPage + 1);
    }

    isClaimPreviousPage(): void {

        const page = this.isCaseClaimsCurrentPage - 1;

        if (!page || page < 1) {
            return;
        }

        this.listISCaseClaims(this.isCaseClaimsCurrentPage - 1);

    }

    isClaimResetPagination(emit: boolean = true, resetSize: boolean = false): void {
        this.isCaseClaimsCurrentPage = this.defaultPageIndex;
        this.isCaseClaimsLastPage = true;

        if (resetSize) {
            this.isCaseClaimsCurrentPageSize = this.defaultPageSize;
        }

        if (emit) {
            this.isCaseClaimsPageData.next({ pageSize: this.isCaseClaimsCurrentPageSize, currentPage: this.isCaseClaimsCurrentPage, lastPage: this.isCaseClaimsLastPage });
        }
    }

    resetISClaimDetailData(): void {
        this.onISCaseClaimsDetailChanged.next({});
    }

    resetISClaimListData(): void {
        this.isCaseClaims = [];
        this.onISCaseClaimsChanged.next({
            items: [],
            lastPage: this.isCaseClaimsLastPage
        });
    }

    unsubscribeISClaimOptions(resetPagination: boolean = true, resetDetailData: boolean = true, resetList: boolean = true): void {

        this._unsubscribeAllISClaims.next();
        this._unsubscribeAllISClaims.complete();

        // reinitialize 
        this._unsubscribeAllISClaims = new Subject();

        this.isCaseClaimsEventsSet = false;

        // reset all variables
        this.isCaseClaimsFilterBy = null;
        this.defaultPageSize = 5;
        this.defaultPageIndex = 1;

        this.isCaseClaims = [];

        this.isCaseClaimsFilterData.next(null);

        if (resetPagination) {
            this.isClaimResetPagination();
        }

        if (resetDetailData) {
            this.resetISClaimDetailData();
        }

        if (resetList) {
            this.resetISClaimListData();
        }

    }

    addISCaseClaimDependency(isCase: ISCase): Observable<any> {

        const enrolmentIds = isCase.ListOfISEnrolments && isCase.ListOfISEnrolments.ISEnrolment ? _.map(isCase.ListOfISEnrolments.ISEnrolment, 'EnrolmentId') : [];

        const postObject = {
            enrolment_ids: enrolmentIds
        };

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-is-case-claim-dependency`, postObject)
            .pipe(
                map((response) => {

                    const children = response.data && response.data.children && _.isArray(response.data.children) ? response.data.children.map((value: any, idx: number) => new Child(value, idx)) : [];
                    const educators = response.data && response.data.educators && _.isArray(response.data.educators) ? response.data.educators.map((value: any, idx: number) => new User(value, idx)) : [];

                    return { children, educators };
                })
            );


    }

    addISCaseClaim(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-is-case-claim`, postData)
            .pipe(
                map((response) => {
                    return response.message;
                })
            );


    }

    cancelISCaseClaim(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/cancel-is-case-claim`, postData)
            .pipe(
                map((response) => {
                    return response.message;
                })
            );


    }

    getDisplayTimeMomentObject(time: string | null): moment.Duration | null {

        if (!time) {
            return moment.duration({ hour: 0, minute: 0 });
        }

        const splitValue = time.split(':');

        return moment.duration({ hour: parseInt(splitValue[0], 10), minute: parseInt(splitValue[1], 10) });

    }

    durationToDisplay(duration: moment.Duration): string {

        return Math.floor(duration.asHours()).toString().padStart(2, '0') + moment.utc(duration.asMilliseconds()).format(':mm');

    }

    getMinimumEducators(serviceType: string, caseType: string, paymentType: string): number {

        const educatorMap: MinimumEducatorMap[] = [
            {
                serviceType: 'FDC',
                caseType: 'FDC Top Up',
                paymentType: 'IDF Subsidy-FDC Pupil Free Day',
                minimumEducators: 0,
                rejectionDays: 67
            },
            {
                serviceType: 'ASC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Centre Based Care',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'ASC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Pupil Free Day',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'ASC',
                caseType: 'Immediate/Time-Limited',
                paymentType: 'IDF Subsidy-Immediate Support',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'BSC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Centre Based Care',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'BSC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Pupil Free Day',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'BSC',
                caseType: 'Immediate/Time-Limited',
                paymentType: 'IDF Subsidy-Immediate Support',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'IHC',
                caseType: 'Inclusion Support - IHC',
                paymentType: 'IHC-Inclusion Support',
                minimumEducators: 0,
                rejectionDays: 67
            },
            {
                serviceType: 'IHC',
                caseType: 'Inclusion Support - IHC',
                paymentType: 'IHC-Pupil Free Day',
                minimumEducators: 0,
                rejectionDays: 67
            },
            {
                serviceType: 'CBDC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Centre Based Care',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'CBDC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Pupil Free Day',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'CBDC',
                caseType: 'Immediate/Time-Limited',
                paymentType: 'IDF Subsidy-Immediate Support',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'OCC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Centre Based Care',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'OCC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Pupil Free Day',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'OCC',
                caseType: 'Immediate/Time-Limited',
                paymentType: 'IDF Subsidy-Immediate Support',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'VAC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Centre Based Care',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'VAC',
                caseType: 'IDF Subsidy',
                paymentType: 'IDF Subsidy-Pupil Free Day',
                minimumEducators: 1,
                rejectionDays: 67
            },
            {
                serviceType: 'VAC',
                caseType: 'Immediate/Time-Limited',
                paymentType: 'IDF Subsidy-Immediate Support',
                minimumEducators: 1,
                rejectionDays: 67
            }
        ];

        const index = _.findIndex(educatorMap, { serviceType, caseType, paymentType });

        if (index === -1) {
            return 0;
        } else {
            return educatorMap[index].minimumEducators;
        }

    }

    // -----------------------------------------------------------------------------------------------------
    // IS Case Claim Submissions
    // -----------------------------------------------------------------------------------------------------

    listISCaseClaimSubmissions(): Promise<any> {

        return new Promise((resolve, reject) => {

            // set table loader
            this.onISCaseClaimSubmissionsTableLoaderChanged.next(true);

            if (_.isNull(this.isCaseClaimSubmissionsPagination)) {
                // set default value
                this.isCaseClaimSubmissionsPagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            }

            const params = new HttpParams()
                .set('page', this.isCaseClaimSubmissionsPagination.page)
                .set('offset', this.isCaseClaimSubmissionsPagination.size)
                .set('search', this.isCaseClaimSubmissionsSearchText)
                .set('sort', JSON.stringify(this.isCaseClaimSubmissionsSortBy))
                .set('filters', JSON.stringify(this.isCaseClaimSubmissionsFilterBy));

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/is-case-claim-submissions-list`, { params })
                .pipe(
                    take(1),
                    map(response => {

                        this.isCaseClaimSubmissions = response.data;

                        this.isCaseClaimSubmissionsTotalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.isCaseClaimSubmissionsTotalRecords = response.totalRecords;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.isCaseClaimSubmissions],
                            totalDisplay: this.isCaseClaimSubmissionsTotalDisplayRecords,
                            total: this.isCaseClaimSubmissionsTotalRecords
                        };
                    }),
                    finalize(() => {
                        setTimeout(() => this.onISCaseClaimSubmissionsTableLoaderChanged.next(false), 300);
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response: any) => {

                        this.onISCaseClaimSubmissionsChanged.next(response);

                        resolve(null);

                    },
                    reject
                );

        });

    }

    deleteClaimSubmission(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/is-case-claim-submissions-delete`, postData)
        .pipe(
            map((response) => {
                return response.message;
            })
        );

    }

    setISCaseClaimSubmissionsEvents(): void {

        this.onISCaseClaimSubmissionsSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAllISClaiSubmissions))
            .subscribe(searchText => {
                this.isCaseClaimSubmissionsSearchText = searchText;
                this.listISCaseClaimSubmissions();
            });

        this.onISCaseClaimSubmissionsSortChanged
            .pipe(takeUntil(this._unsubscribeAllISClaiSubmissions))
            .subscribe(sort => {
                this.isCaseClaimSubmissionsSortBy = sort;
                this.listISCaseClaimSubmissions();
            });

        this.onISCaseClaimSubmissionsPaginationChanged
            .pipe(takeUntil(this._unsubscribeAllISClaiSubmissions))
            .subscribe(pagination => {
                this.isCaseClaimSubmissionsPagination = pagination;
                this.listISCaseClaimSubmissions();
            });

        this.onISCaseClaimSubmissionsFilterChanged
            .pipe(takeUntil(this._unsubscribeAllISClaiSubmissions))
            .subscribe((filter) => {

                this.isCaseClaimSubmissionsFilterBy = filter;
                // reset page index
                if (!_.isNull(this.isCaseClaimSubmissionsPagination)) {
                    this.isCaseClaimSubmissionsPagination.page = this.defaultPageIndex;
                }

                this.listISCaseClaimSubmissions();

            });

    }

    unsubscribeISCaseClaimSubmissionsOptions(): void {
        this._unsubscribeAllISClaiSubmissions.next();
        this._unsubscribeAllISClaiSubmissions.complete();

        // reinitialize 
        this._unsubscribeAllISClaiSubmissions = new Subject();

        // reset all variables
        this.isCaseClaimSubmissionsPagination = null;
        this.isCaseClaimSubmissionsSortBy = null;
        this.isCaseClaimSubmissionsSearchText = null;
        this.isCaseClaimSubmissionsFilterBy = null;
        this.isCaseClaimSubmissionsTotalDisplayRecords = 0;
        this.isCaseClaimSubmissionsTotalRecords = 0;
        this.isCaseClaimSubmissions = [];
    }
}

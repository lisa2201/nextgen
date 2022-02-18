import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { shareReplay, map, takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { AppConst } from 'app/shared/AppConst';
import { Child } from '../../../child/child.model';
import { Bus } from '../bus-list.model';
import { School } from '../school-list.model';

@Injectable()
export class BusListService {
    onBusListChange : BehaviorSubject<any>;
    onSchoolListChange : BehaviorSubject<any>;
    private _unsubscribeAll: Subject<any>;

    pagination: any | null = null;
    defaultPageIndex: any = 1;
    defaultPageSize: any = 10;
    defaultPageSizeOptions: number[] = [5, 10, 20];
    onPaginationChanged: Subject<any>;
    onSchoolPaginationChanged: Subject<any>;
    onSchoolSearchTextChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    searchTextSchool: string | null = null;
    searchText: string | null = null;
    totalRecordsSchool = 0;
    displayRecordsSchool = 0;
    totalRecordsBus = 0;
    displayRecordsBus = 0;

  constructor(
    private _httpClient: HttpClient
  ) {
    this.onBusListChange = new BehaviorSubject([]);
    this.onSchoolListChange = new BehaviorSubject([]);
    this.onPaginationChanged = new Subject();
    this.onSchoolPaginationChanged = new Subject();
    this.onSchoolSearchTextChanged = new Subject();
    this.onSearchTextChanged = new Subject();

    this._unsubscribeAll = new Subject();
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
            Promise.all([        
                this.getBusList(),
                this.getSchoolList()
            ])
            .then(([list]: [any, any]) => 
            {
                this.onPaginationChanged
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(pagination => {
                        this.pagination = pagination;
                        this.getBusList();
                    });

                this.onSchoolPaginationChanged
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(pagination => {
                        this.pagination = pagination;
                        this.getSchoolList();
                    });

                this.onSearchTextChanged
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(searchText => {
                        this.searchText = searchText;
                        this.getBusList();
                    });

                this.onSchoolSearchTextChanged
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(searchText => {
                        this.searchTextSchool = searchText;
                        this.getSchoolList();
                    });

                resolve(null);
            })
            .catch(error => 
            {
                reject(error);
            });
        });
    }

    getBusList(allbusses: boolean = false): Promise<any> {

        return new Promise((resolve, reject) => {

            if (_.isNull(this.pagination)) {
                // set default value
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            }
            let params = null;
            if(!allbusses)
            {
                params = new HttpParams()
                    .set('page', this.pagination.page)
                    .set('offset', this.pagination.size)
                    .set('search', this.searchText);
            }

            return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-bus-list`, { params })
            .pipe(
                map((response) => {
                    this.totalRecordsBus = response.totalRecords;
                    this.displayRecordsBus = response.meta ? response.meta.total : 0;
                    return {
                        items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : response.data.map((i: any, idx: number) => new Bus(i, idx)),
                        totalDisplay: this.displayRecordsBus,
                        total: this.totalRecordsBus,
                    };

                }),
                shareReplay()
            )
            .subscribe(
                (response: any) => {
                    this.onBusListChange.next(response);
                    resolve(response);
                },
                reject
            );
        });
    }


    getChildrenBySchool(schoolID: string = ''): Observable<any> {

        let params = new HttpParams();
        params = params.set('schoolID', schoolID);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-by-school`, {params})
            .pipe(
                map(depends => {
                    if (depends.data && _.keys(depends.data).length < 1) {
                        return {};
                    }
                    else {
                        return {
                            childList: depends.data.map((i: any, idx: number) => new Child(i, idx))
                        };
                    }
                }),
                shareReplay()
            );
    }

    getChildrenAndSchoolsByBus(busID: string = ''): Observable<any> {

        let params = new HttpParams();
        params = params.set('busID', busID);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-by-bus`, {params})
            .pipe(
                map(depends => {
                    if (depends.data && _.keys(depends.data).length < 1 && !depends.schools) {
                        return {};
                    }
                    else {
                        return {
                            schoolList: depends.schools,
                            childList: (depends.data) ? depends.data.map((i: any, idx: number) => new Child(i, idx)) : null
                        };
                    }
                }),
                shareReplay()
            );
    }


    getSchoolList(): Promise<any> {

        return new Promise((resolve, reject) => {

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
                .set('search', this.searchTextSchool);

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-school-list`, { params })
                .pipe(
                    map((response) => {
                        this.totalRecordsSchool = response.totalRecords;
                        this.displayRecordsSchool = response.meta ? response.meta.total : 0;
                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : response.data.map((i: any, idx: number) => new School(i, idx)),
                            totalDisplay: this.displayRecordsSchool,
                            total: this.totalRecordsSchool,
                        };

                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        this.onSchoolListChange.next(response);
                        resolve(response);
                    },
                    reject
                );
        });
    }


    createBus(postData: any): Observable<any> {

    return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-bus`, postData)
      .pipe(

        map((response) => {
            this.getBusList();
            return response;

        })
      );

    }

    updateBus(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-bus`, postData)
            .pipe(

                map((response) => {
                    this.getBusList();
                    return response;

                })
            );

    }

    deleteBus(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-bus`, postData)
            .pipe(

                map((response) => {
                    this.getBusList();
                    return response.message;

                })
            );

    }



    createSchool(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-school`, postData)
            .pipe(

                map((response) => {
                    this.getBusList();
                    this.getSchoolList();
                    return response;

                })
            );

    }

    updateSchool(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-school`, postData)
            .pipe(

                map((response) => {
                    this.getBusList();
                    this.getSchoolList();
                    return response;

                })
            );

    }

    deleteSchool(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-school`, postData)
            .pipe(

                map((response) => {
                    this.getBusList();
                    this.getSchoolList();
                    return response.message;

                })
            );

    }

    /*removed after the room id was also applied to buslit*/
    /*addChildrenToBus(postData: any, busID, schoolID): Observable<any> {
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-children-to-bus`, postData)
            .pipe(

                map((response) => {
                    if(busID!==null)
                        this.getChildrenAndSchoolsByBus(busID);
                    if(schoolID!==null)
                        this.getChildrenBySchool(schoolID);
                    return response;

                })
            );
    }*/

}
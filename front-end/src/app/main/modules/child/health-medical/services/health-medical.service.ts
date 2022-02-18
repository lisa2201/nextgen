import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, Resolve } from '@angular/router';
import { Observable, forkJoin, Subject, BehaviorSubject } from 'rxjs';
import { browserRefresh } from 'app/app.component';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import {map, shareReplay, takeUntil, finalize, first} from 'rxjs/operators';
import { HealthMedical } from '../health-medical.model';
import { HealthAndMedical } from '../health-and-medical.model';
import {ChildrenService} from '../../services/children.service';
import {Child} from '../../child.model';

@Injectable()
export class HealthMedicalService implements Resolve<any> {

    private _unsubscribeAll: Subject<any>;

    onPaginationChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    
    onAllergyChanged: BehaviorSubject<any>;
    onMedicalChanged: BehaviorSubject<any>;
    onChildChanged: BehaviorSubject<any>;
    routeParams: any;

    childId: string;
    allergy: HealthMedical[];
    healthAndMedical: HealthAndMedical;
    defaultPageIndex: any;
    defaultPageSize: any;
    defaultPageSizeOptions: number[];

    totalRecords: number;
    totalDisplayRecords: number;
    pagination: any | null = null;
    isFiltered: any;
    searchText: any;
    private child: Child;

    constructor(
        private _httpClient: HttpClient,
        private _router: Router,
        private _childrenService: ChildrenService,
    ) {
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this._unsubscribeAll = new Subject();
        this.onChildChanged = new BehaviorSubject([]);

        this.onMedicalChanged =  new BehaviorSubject([]);
        this.onAllergyChanged = new BehaviorSubject([]);

        this.searchText = null;
        this.defaultPageIndex = 1;
        this.defaultPageSize = 5;
        this.defaultPageSizeOptions = [5, 10, 20];

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
        this.routeParams = route.params;
        this.childId = route.params.id;
        return new Promise((resolve, reject) => {
            Promise.all([
                this.getAllergies(this.routeParams.id),
                this.getMedical(this.routeParams.id),
                this.getChild(this.routeParams.id),
            ])
                .then(([medical,allergies, child]: [any, any, any]) => {
                    this.setEvents();

                    resolve();
                })
                .catch(error => {
                    reject(error);
                });

        });
    }

    setEvents(): void {

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination
                this.getAllergies(this.childId);
            });

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText => {
                this.searchText = searchText;
                this.getAllergies(this.childId);
            });

    }

    getAllergies(index: any): Promise<any> {

        return new Promise((resolve, reject) => {
            // set table loader
            this.onTableLoaderChanged.next(true);

            if (_.isNull(this.pagination)) {
                // set default value
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            }

            const params = new HttpParams()
                .set('child_id', index)
                .set('page', this.pagination.page)
                .set('offset', this.pagination.size)
                .set('search', this.searchText);

            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-selected-allergies`, { params })
                .pipe(
                    map((response) => {
                        this.allergy = response.data.map((i: any, idx: number) => new HealthMedical(i, idx));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;

                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.allergy],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                        };

                    }),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        this.onAllergyChanged.next(response);

                        resolve();
                    },
                    reject
                );
        });
    }


    /**
     * get Allergy Typew
     *
     * @returns {Observable<any>}
     */
    getAllergyTypes(): Observable<any> {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-allergy-types`, {})
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length < 1) {
                        return {};
                    }
                    else {
                        return {
                            allergyTypes: response.data
                        };
                    }
                }),
                shareReplay()
            );
    }

    storeAllergy(postData: any): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-allergy-store`, postData)
            .pipe(
                map((response) => {
                    this.getAllergies(postData['childId'])
                    return response.message;

                })
            );
    }

    updateAllergy(postData: any): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-allergy-update`, postData)
            .pipe(
                map((response) => {
                    this.getAllergies(postData['childId'])
                    return response.message;

                })
            );
    }

    deleteAllergy(index: any): Observable<any> {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-allergy`, { params })
            .pipe(
                map(response => response.message),
                shareReplay()
            );

    }

    getMedical(index: any): Promise<any> {

        return new Promise((resolve, reject) => {
      

            const params = new HttpParams()
                .set('child_id', index);
             
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-health-medical`, { params })
                .pipe(
                    map((response) => {
                        this.healthAndMedical =  new HealthAndMedical(response.data);
                        return this.healthAndMedical;
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {

                        this.onMedicalChanged.next(response);

                        resolve();
                    },
                    reject
                );
        });
    }

      storeHealthMedical(postData: any): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-health-medical-update`, postData)
            .pipe(
                map((response) => {
                    // this.getMedical(postData['childId'])
                    this.getMedical(this.routeParams.id);
                    return response.message;

                })
            );
    }

    /**
     * Get child item
     *
     * @returns {Promise<any>}
     */
    getChild(index: string): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._childrenService
                .getChild(index)
                .pipe(first())
                .subscribe(
                    (response) =>
                    {
                        this.child = response;

                        this.onChildChanged.next(this.child);

                        resolve();
                    },
                    reject
                );
        });
    }
}

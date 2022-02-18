import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
    Router,
    ActivatedRouteSnapshot,
    RouterStateSnapshot
} from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { first, map, shareReplay } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { browserRefresh } from 'app/app.component';
import { Child } from '../../child/child.model';
import { ParentChildrenService } from './parent-children.service';
import { AppConst } from 'app/shared/AppConst';
import { Enrolment } from '../../child/enrolment/models/enrolment.model';



@Injectable({providedIn: 'root'})
export class ParentChildService {
    onChildChanged: BehaviorSubject<any>;
    onchildrenChanged: BehaviorSubject<any>;
    onEntrolmentChanged: BehaviorSubject<any>;
    private _unsubscribeAll: Subject<any>;

    routeParams: any;

    private child: Child;
    private children: Child[];
    enrolment: Enrolment;

    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {ChildrenService} _childrenService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _router: Router,
        private _ParentchildrenService: ParentChildrenService
    ) {
        // Set the defaults
        this.onChildChanged = new BehaviorSubject([]);
        this.onchildrenChanged = new BehaviorSubject([]);
        this.onEntrolmentChanged = new BehaviorSubject([]);
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
    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        this.routeParams = route.params;

        return new Promise<void>((resolve, reject) => {
            Promise.all([this.getChild(this.routeParams.id), this.getChildren()])
                .then(([child, children]: [Child, Child[]]) => {
                    resolve();
                })
                .catch(error => {
                    if (browserRefresh && state.url !== '') {
                        this._router.navigate([
                            _.head(_.filter(state.url.split('/'), _.size))
                        ]);
                    }

                    reject(error);
                });
        });
    }

    // tslint:disable-next-line: typedef
    resetDeclarations() {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this.children = [];
        this.child = null;

        // reinitialize
        this._unsubscribeAll = new Subject();
    }

    /**
     * Get child item
     *
     * @returns {Promise<any>}
     */
    getChild(index: string): Promise<any> {
        return new Promise((resolve, reject) => {
          
                this._ParentchildrenService
                    .getChild(index)
                    .pipe(first())
                    .subscribe(response => {
                        this.child = response;
                        this.onChildChanged.next(this.child);

                        resolve();
                    }, reject);
            
        });
    }

    getChildren(): Promise<any>  {
        return new Promise((resolve, reject) => 
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-list-parent`)
                .pipe(
                    map((response: any) => {
                        this.children =  response.data.map((i: any, idx: number) => new Child(i, idx));
                        this.onchildrenChanged.next(this.children);
                    }),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => resolve(response),
                    reject
                );
            
        });
    }

    acceptCWA(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/accept-cwa`, data)
            .pipe(
                map(response => 
                {                    
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new Enrolment(response.data);
                        
                        const index = this.child.enrollments.findIndex((val) => val.id === item.id);

                        item.isNew = true;
                        item.index = this.child.enrollments[index].index;

                        this.child.enrollments[index] = item;
                        
                        this.onEntrolmentChanged.next([...this.child.enrollments]);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    updateChild(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-child-parent-login`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.child = new Child(response.data)
                        this.onChildChanged.next(this.child);
                        return {
                            item: this.child,
                            message: response.message
                        };
                    }
                    else
                    {
                        return { message: response.message };    
                    }
                }),
                shareReplay()
            );
    }

    storeHealthMedical(postData: any): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-health-medical-update-parent-login`, postData)
            .pipe(
                map((response) => {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.child = new Child(response.data)
                        this.onChildChanged.next(this.child);
                        return {
                            item: this.child,
                            message: response.message
                        };
                    }
                    else
                    {
                        return { message: response.message };    
                    }

                }),
                shareReplay()
            );
    }

    getAllergyTypes(): Observable<any> {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-allergy-types-parent`, {})
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length < 1) {
                        return {};
                    }
                    else {
                        return response.data;
                    }
                }),
                shareReplay()
            );
    }

    storeAllergy(postData: any): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-allergy-store-parent`, postData)
            .pipe(
                map((response) => {
                    this.getChild(this.routeParams.id)
                    return response.message;

                })
            );
    }

    updateAllergy(postData: any): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/child-allergy-update-parent`, postData)
            .pipe(
                map((response) => {
                    this.getChild(this.routeParams.id)
                    return response.message;

                })
            );
    }

    deleteAllergy(index: any): Observable<any> {

        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-allergy-parent`, { params })
            .pipe(
                map(response => {
                    this.getChild(this.routeParams.id);
                    return response.message;
                }),
                shareReplay()
            );

    }

    storeDocuments(postData: any): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-child-documents`, postData)
            .pipe(
                map((response) => {
                    this.getChild(this.routeParams.id);
                    return response.message;

                })
            );
    }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, Resolve } from '@angular/router';
import { Observable, forkJoin, Subject, BehaviorSubject } from 'rxjs';
import { browserRefresh } from 'app/app.component';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import {map, shareReplay, takeUntil, finalize, first} from 'rxjs/operators';
import {Child} from '../../child.model';
import {ChildrenService} from '../../services/children.service';


@Injectable()
export class ChildDocumentsService implements Resolve<any> {

    private _unsubscribeAll: Subject<any>;
    private child: Child;

    onDocumentChanged: BehaviorSubject<any>;
    routeParams: any;
    onChildChanged: BehaviorSubject<any>;

    childId: string;


    totalRecords: number;
    totalDisplayRecords: number;
    pagination: any | null = null;
    isFiltered: any;
    searchText: any;

    constructor(
        private _httpClient: HttpClient,
        private _router: Router,
        private _childrenService: ChildrenService,
    ) {

        this._unsubscribeAll = new Subject();
        this.onChildChanged = new BehaviorSubject([]);
        this.onDocumentChanged =  new BehaviorSubject([]);



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
                this.getDocuments(this.routeParams.id),
                this.getChild(this.routeParams.id),

            ])
                .then( response => {
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });

        });
    }


    /**
     * get Child Documents
     *
     * @returns {Observable<any>}
     */
    getDocuments(index: any): Promise<any> {
        return new Promise((resolve, reject) => {

            const params = new HttpParams()
                .set('child_id', index);
                        return this._httpClient
                            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-documents`, { params })
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
                            ).subscribe(
                                (response: any) => {

                                    this.onDocumentChanged.next(response);

                                    resolve();
                                },
                                reject
                            );
        });
    }


    storeDocuments(postData: any): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-child-documents`, postData)
            .pipe(
                map((response) => {
                    // this.getMedical(postData['childId'])
                    this.getDocuments(postData.childId);
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

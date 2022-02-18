import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay, finalize, takeUntil, tap } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';

import { AppConst } from 'app/shared/AppConst';
import { User } from '../../user/user.model';
import { Room } from '../../room/models/room.model';
import { Child } from '../../child/child.model';


@Injectable({providedIn: 'root'})
export class ParentChildrenService {
    private _unsubscribeAll: Subject<any>;

    private children: Child[];
    private users: User[];
    private rooms: Room[];

    onChildrenChanged: BehaviorSubject<any>;
    onFilterRoomsChanged: BehaviorSubject<any>;

    onCurrentChildChanged: Subject<any>;
    onSelectedChildrenChanged: Subject<any>;
    onListViewItemChanged: Subject<any>;

    onPaginationChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;

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

    currentChild: Child;
    selectedChild: Child[];

    /**
     * Constructor
     *
     * @param {AuthService} _authService
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {BranchService} _branchService
     */
    constructor(
        private _authService: AuthService,
        private _httpClient: HttpClient,
        private _logger: NGXLogger
    ) {
        // Set the defaults
        this.selectedChild = [];
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this.onChildrenChanged = new BehaviorSubject([]);
        this.onFilterRoomsChanged = new BehaviorSubject([]);

        this.onCurrentChildChanged = new Subject();
        this.onSelectedChildrenChanged = new Subject();
        this.onListViewItemChanged = new Subject();

        // this.onUserStatusChanged = new Subject();
        this.onPaginationChanged = new Subject();
        // this.onSearchTextChanged = new Subject();
        // this.onSortChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        // this.onFilterChanged = new Subject();

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
        return new Promise((resolve, reject) => {
            Promise.all([
                this.getChildren()
                // this.getRooms().toPromise(),
                // this.getUsers().toPromise()
            ])
                .then(([children, rooms, users]: [any, any, any]) => {
                    // this.rooms = rooms;
                    // this.users = users;

                    this.setEvents();

                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * reset all variables
     */
    // tslint:disable-next-line: typedef
    resetDeclarations() {
        this.pagination = null;
        this.filterBy = '0';
        this.sortBy = null;
        this.searchText = null;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.children = [];
        this.isFiltered = false;
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize
        this._unsubscribeAll = new Subject();
    }

    /**
     * set events after resolve
     */
    setEvents(): void {
        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {
                this.pagination = pagination;

                this.getChildren();
            });
    }

    /**
     * get room list by user
     *
     * @param {string} [childId='']
     * @returns {Observable<any>}
     */
    getRooms(childId: string = ''): Observable<any> {
        let params = new HttpParams();

        if (childId !== '') {
            params = params.set('id', childId);
        }

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-room-list`,
                { params }
            )
            .pipe(
                map(response =>
                    response.data.map((i: any, idx: number) => new Room(i, idx))
                ),
                shareReplay()
            );
    }

    /**
     * get user list
     *
     * @param {string} [childId='']
     * @returns {Observable<any>}
     */
    getUsers(childId: string = ''): Observable<any> {
        let params = new HttpParams();

        if (childId !== '') {
            params = params.set('id', childId);
        }

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-parent-type-list`,
                { params }
            )
            .pipe(
                map(response =>
                    response.data.map((i: any, idx: number) => new User(i, idx))
                ),
                shareReplay()
            );
    }

    /**
     * get children list
     *
     * @returns {Promise<any>}
     */
    getChildren(): Promise<any> {
        return new Promise((resolve, reject) => {
            // set table loader
            this.onViewLoaderChanged.next(true);

            return this._httpClient
                .get<any>(
                    `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-list-parent`,
                )
                .pipe(
                    map(response => {
                        if (typeof this.children === 'undefined') {
                            this.children = [];
                        }

                        this.children = this.children
                            .concat(
                                response.data.map(
                                    (i: any, idx: number) => new Child(i, idx)
                                )
                            )
                            .map((i: any, idx: number) => {
                                i.index = idx;
                                return i;
                            });

                        this.totalDisplayRecords = response.total
                            ? response.total
                            : 0;

                        return {
                            items: [...this.children],
                            totalDisplay: this.totalDisplayRecords
                        };
                    }),
                    finalize(() =>
                        setTimeout(
                            () => this.onViewLoaderChanged.next(false),
                            200
                        )
                    ),
                    shareReplay()
                )
                .subscribe((response: any) => {
                    this.onChildrenChanged.next(response);

                    resolve();
                }, reject);
        });
    }

    /**
     * Get child item
     *
     * @returns {Observable<any>}
     */
    getChild(index: string): Observable<any> {
        const params = new HttpParams().set('index', index);
        

        return this._httpClient
            .get<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-info-parent`,
                { params }
            )
            .pipe(
                map(response => new Child(response.data)),
                shareReplay()
            );
    }

   
    clearLastRememberOptions(): void {
        this.currentChild = null;
        this.selectedChild = [];

        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

    setCurrentChild(id: string): void
    {
        this.currentChild = this.children.find(c => c.id === id);

        this.onCurrentChildChanged.next(this.currentChild);
    }

    getChildrenTotal(): Child[]{
        return this.children;
    }
}

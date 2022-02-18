import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay, finalize, takeUntil, tap } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { AppConst } from 'app/shared/AppConst';
import { Child } from '../child.model';
import { User } from '../../user/user.model';
import { Room } from '../../room/models/room.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { CommonService } from 'app/shared/service/common.service';

@Injectable()
export class ChildrenService
{
    private _unsubscribeAll: Subject<any>;

    private children: Child[];
    private users: User[];
    private rooms: Room[];

    onChildrenChanged: BehaviorSubject<any>;
    onFilterRoomsChanged: BehaviorSubject<any>;
    onFilterDependencyChanged: BehaviorSubject<any>;

    onCurrentChildChanged: Subject<any>;
    onSelectedChildrenChanged: Subject<any>;
    onListViewItemChanged: Subject<any>;
    onDetailViewContentChanged: Subject<any>;

    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 10;
    defaultPageSizeOptions: number[] = [10, 20];

    paginationMeta: any;
    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    searchText: string | null = null;

    currentChild: Child;
    selectedChild: Child[];

    ccsExists: boolean;
    ccsExistsChanged: Subject<any>;

    /**
     * Constructor
     * 
     * @param {AuthService} _authService
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notificationService
     * @param {Router} _router
     */
    constructor(
        private _authService: AuthService,
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _notificationService: NotificationService,
        private _router: Router,
        private _commonService: CommonService
    )
    {
        // Set the defaults
        this.selectedChild = [];
        this.paginationMeta = null;
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this.onChildrenChanged = new BehaviorSubject([]);
        this.onFilterRoomsChanged = new BehaviorSubject([]);
        this.onFilterDependencyChanged = new BehaviorSubject([]);
        
        this.onCurrentChildChanged = new Subject();
        this.ccsExistsChanged = new Subject();
        this.onSelectedChildrenChanged = new Subject();
        this.onListViewItemChanged = new Subject();
        this.onDetailViewContentChanged = new Subject();

        this.onPaginationChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();

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
        return new Promise((resolve, reject) =>
        { 
            Promise.all([
                this.getChildren(),
                this.getRooms().toPromise(),
                this.getUsers().toPromise(),
                this.getDependency().toPromise()
            ])
            .then(([children, rooms, users, depend]: [any, any, any, any]) => 
            {  
                this.setEvents({
                    rooms: rooms,
                    users: users,
                    depend: depend
                });
                
                resolve(null);
            })
            .catch(errorResponse => 
            {
                reject(errorResponse);
            });
        });
    }

    /**
     * set events after resolve
     */
    setEvents(depends: { rooms: Room[], users: User[], depend: any } = null): void 
    {
        if (!_.isNull(depends))
        {
            this.rooms = depends.rooms;
            this.users = depends.users;
            
            this.onFilterDependencyChanged.next(depends);
        }

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText =>
            {
                this.searchText = searchText;

                this.getChildren();
            });
        
        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination =>
            {
                this.pagination = pagination;

                this.getChildren();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;

                // reset page index
                if (!_.isNull(this.pagination))
                {
                    this.pagination.page = this.defaultPageIndex;
                }

                // reset current child
                this.resetCurrentChild();

                this.getChildren();
            });
        
    }

    /**
     * get room list by user
     *
     * @param {string} [childId='']
     * @returns {Observable<any>}
     */
    getRooms(childId: string = ''): Observable<any>
    {
        let params = new HttpParams();

        if (childId !== '')
        {
            params = params.set('id', childId);
        }

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-room-list`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Room(i, idx))),
                shareReplay()
            );
    }

    /**
     * get child parent list 
     *
     * @param {string} [childId='']
     * @returns {Observable<any>}
     */
    getUsers(childId: string = ''): Observable<any>
    {
        let params = new HttpParams();

        if (childId !== '')
        {
            params = params.set('id', childId);
        }
            
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-parent-type-list`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new User(i, idx))),
                shareReplay()
            );
    }

    /**
     * Get user list for emergency selector resolve
     *
     * @param {string} [childId='']
     * @returns {Observable<any>}
     */
    getUsersForEmergencyContacts(childId: string = ''): Observable<any> 
    {
        let params = new HttpParams();

        if (childId !== '')
        {
            params = params.set('id', childId);
        }

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-users-for-emergency-contacts`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new User(i, idx))),
                shareReplay()
            );
    }

    /**
     * get children list
     *
     * @returns {Promise<any>}
     */
    getChildren(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            // set table loader
            this.onViewLoaderChanged.next(true);

            if (_.isNull(this.pagination))
            {
                // set default value
                this.pagination = {
                    page: this.defaultPageIndex,
                    size: this.defaultPageSize
                };
            }

            const params = new HttpParams()
                .set('page', this.pagination.page)
                .set('offset', this.pagination.size)
                .set('search', this.searchText)
                .set('sort', JSON.stringify(this.sortBy))
                .set('filters', JSON.stringify(this.filterBy));
            
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children-list`, { params })
                .pipe(
                    map(response =>
                    {
                        this.children = response.data.map((i: any, idx: number) => new Child(i, idx));

                        this.paginationMeta = response.meta || null;
                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;
                        this.ccsExists = response.ccsEnabled;

                        return {
                            meta: this.paginationMeta,
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : [...this.children],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        };
                    }),
                    finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.onChildrenChanged.next(response);

                        resolve(null);
                    },
                    reject
                );
        });
    }

    /**
     * get children dependency
     */
    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/children-data`, {})
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        return {
                            CCSFilters: response.data.ccs_status
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * Create new child
     * 
     * @returns {Observable<any>}
     */
    storeChild(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-child`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    
                    this.getChildren();

                    return response;
                }),
                shareReplay()
            );
    }

    /**
     * Get child item
     * 
     * @returns {Observable<any>}
     */
    getChild(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-info`, { params })
            .pipe(
                map(response => new Child(response.data)),
                shareReplay()
            );
    }

    getChildShortData(index: string): Observable<any>
    {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/find-by-id-short-data`, { params })
            .pipe(
                map(response => new Child(response.data)),
                shareReplay()
            );
    }

    /**
     * get children list
     * 
     * @returns {Observable<any>}
     */
    getChildrenList(filters: any = []): Observable<any>
    {
        // const params = new HttpParams()
        //     .set('page', this.pagination.page)

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-children`, {})
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Child(i, idx))),
                shareReplay()
            );
    }

    /**
     * Update child item
     * 
     * @returns {Observable<any>}
     */
    updateChild(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-child`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        // call re-count of children without primary payer
                        this._commonService.getChildrenWithoutPrimaryPayer().subscribe();
                        
                        return {
                            item: new Child(response.data),
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


    /**
     * Add child bus
     *
     * @returns {Observable<any>}
     */
    addChildBus(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-bus-for-child`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        // call re-count of children without primary payer
                        this._commonService.getChildrenWithoutPrimaryPayer().subscribe();

                        return {
                            item: new Child(response.data),
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


    /**
     * delete child bus
     *
     * @returns {Observable<any>}
     */
    deleteChildBus(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-bus-from-child`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        // call re-count of children without primary payer
                        this._commonService.getChildrenWithoutPrimaryPayer().subscribe();

                        return {
                            item: new Child(response.data),
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


    /**
     * update enrolment parent status
     *
     * @param {*} data
     * @returns {Observable<any>}
     */
    updateParentStatus(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-enrolment-parent-status`, data)
            .pipe(
                map(response => 
                    {
                        if (response.data && _.keys(response.data).length > 0) 
                        {
                            const item = new Child(response.data);
    
                            // if called by single child edit UI no need to update all children
                            if(this.children)
                            {
                                const index = this.children.findIndex((val) => val.id === item.id);
    
                                item.index = this.children[index].index;
                                this.children[index] = item;
                            }
    
                            this.onChildrenChanged.next(
                                {
                                    meta: this.paginationMeta,
                                    items: (this.children)? [...this.children] : null,
                                    totalDisplay: this.totalDisplayRecords,
                                    total: this.totalRecords,
                                    filtered: this.isFiltered
                                });
    
                            // update current child
                            if(this.children) setTimeout(() => this.setCurrentChild(item.id), 250);
                        }
    
                        return response.message;
                    }),
                    shareReplay()
            );
    }

    
    sendEmailToParent(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/send-cwa-email-to-parent`, data)
            .pipe(
                map(response => 
                    {
                        if (response.data && _.keys(response.data).length > 0) 
                        {
                            const item = new Child(response.data);
    
                            // if called by single child edit UI no need to update all children
                            if(this.children)
                            {
                                const index = this.children.findIndex((val) => val.id === item.id);
    
                                item.index = this.children[index].index;
                                this.children[index] = item;
                            }
    
                            this.onChildrenChanged.next(
                                {
                                    meta: this.paginationMeta,
                                    items: (this.children)? [...this.children] : null,
                                    totalDisplay: this.totalDisplayRecords,
                                    total: this.totalRecords,
                                    filtered: this.isFiltered
                                });
    
                            // update current child
                            if(this.children) setTimeout(() => this.setCurrentChild(item.id), 250);
                        }
    
                        return response.message;
                    }),
                    shareReplay()
            );
    }

    /**
     * Delete a child
     * 
     * @returns {Observable<any>}
     */
    deleteChild(index: string): Observable<any>
    {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-child`, { params })
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;

                    this.getChildren();
                    
                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * add/remove user to child
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateUser(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-child-user`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0) 
                    {
                        const item = new Child(response.data);

                        // if called by single child edit UI no need to update all children
                        if(this.children && this.children.length > 0)
                        {
                            const index = this.children.findIndex((val) => val.id === item.id);

                            item.index = this.children[index].index;
                            this.children[index] = item;
                        }

                        this.onChildrenChanged.next(
                            {
                                meta: this.paginationMeta,
                                items: (this.children)? [...this.children] : null,
                                totalDisplay: this.totalDisplayRecords,
                                total: this.totalRecords,
                                filtered: this.isFiltered
                            });

                        // update current child
                        if(this.children) setTimeout(() => this.setCurrentChild(item.id), 250);

                        // call re-count of children without primary payer
                        this._commonService.getChildrenWithoutPrimaryPayer().subscribe();
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * add/remove user to child
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateEmergencyContacts(postData: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-emergency-contact`, postData)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new Child(response.data);

                        // if called by single child edit UI no need to update all children
                        if(this.children)
                        {
                            const index = this.children.findIndex((val) => val.id === item.id);

                            item.index = this.children[index].index;
                            this.children[index] = item;
                        }

                        this.onChildrenChanged.next(
                            {
                                meta: this.paginationMeta,
                                items: (this.children)? [...this.children] : null,
                                totalDisplay: this.totalDisplayRecords,
                                total: this.totalRecords,
                                filtered: this.isFiltered
                            });

                        // update current child
                        if(this.children)
                            setTimeout(() => this.setCurrentChild(item.id), 250);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * add/remove user to child
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateRoom(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-child-room`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0) 
                    {
                        const item = new Child(response.data);

                        // if called by single child edit UI no need to update all children
                        if(this.children)
                        {
                            const index = this.children.findIndex((val) => val.id === item.id);

                            item.index = this.children[index].index;
                            this.children[index] = item;
                        }

                        this.onChildrenChanged.next(
                            {
                                meta: this.paginationMeta,
                                items: (this.children)? [...this.children] : null,
                                totalDisplay: this.totalDisplayRecords,
                                total: this.totalRecords,
                                filtered: this.isFiltered
                            });

                        // update current child
                        if(this.children) setTimeout(() => this.setCurrentChild(item.id), 250);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * set primary payer
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    setPrimaryPayer(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/set-primary-payer`, data)
            .pipe(
                map(response =>
                {

                    let item = null;

                    if (response.data && _.keys(response.data).length > 0) 
                    {
                        item = new Child(response.data);

                        // if called by single child edit UI no need to update all children
                        if(this.children)
                        {
                            const index = this.children.findIndex((val) => val.id === item.id);

                            if (index !== -1) {
                                item.index = this.children[index].index;
                                this.children[index] = item;
                            }
                        }

                        // update current child
                        if(this.children)
                            setTimeout(() => this.setCurrentChild(item.id), 250);

                        // call re-count of children without primary payer
                        this._commonService.getChildrenWithoutPrimaryPayer().subscribe();
                    }

                    return {
                        message: response.message,
                        item: item
                    };
                }),
                shareReplay()
            );
    }

    /**
     * Set current child by id
     *
     * @param {string} id
     */
    setCurrentChild(id: string): void
    {
        this.currentChild = this.children.find(c => c.id === id);
        this.ccsExistsChanged.next(this.ccsExists);
        this.onCurrentChildChanged.next(this.currentChild);
    }

    /**
     * clear selected current child
     */
    resetCurrentChild(): void
    {
        this.currentChild = null;
        this.ccsExistsChanged.next(this.ccsExists)
        this.onCurrentChildChanged.next(this.currentChild);
    }

    /**
     * Set current child when browser refreshed
     *
     * @param {Child} child
     */
    setDefaultCurrentChild(child: Child): void
    {
        this.currentChild = child;
    }

    /**
     * Deselect child
     */
    deselectChildren(): void
    {
        this.selectedChild = [];

        // Trigger the next event
        // this.onSelectedChildrenChanged.next(this.selectedChild);
    }

    /**
     * Toggle selected child by id
     *
     * @param id
     */
    toggleSelectedChild(id: any): void
    {
        // First, check if we already have that mail as selected...
        if ( this.selectedChild.length > 0 )
        {
            for ( const child of this.selectedChild )
            {
                // ...delete the selected child
                if ( child.id === id )
                {
                    const index = this.selectedChild.indexOf(child);

                    if ( index !== -1 )
                    {
                        this.selectedChild.splice(index, 1);

                        // Trigger the next event
                        this.onSelectedChildrenChanged.next(this.selectedChild);

                        // Return
                        return;
                    }
                }
            }
        }

        // If we don't have it, push as selected
        this.selectedChild.push(
            this.children.find(child =>
            {
                return child.id === id;
            })
        );

        // Trigger the next event
        this.onSelectedChildrenChanged.next(this.selectedChild);
    }

    /**
     * check if service holds children list
     *
     * @returns {boolean}
     */
    hasChildren(): boolean
    {
        return this.children && this.children.length > 0;
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
        // this.children = [];
        this.users = [];
        this.rooms = [];
        
        // reset all variables
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
        this.currentChild = null;
        this.selectedChild = [];

        this.sortBy = null;
        this.searchText = null;
        this.paginationMeta = null;
        this.pagination = null;
        this.filterBy = null;
        this.isFiltered = false;
    }

}

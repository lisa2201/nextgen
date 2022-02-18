import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject, BehaviorSubject, of, forkJoin } from 'rxjs';
import { shareReplay, map, finalize, takeUntil, switchMap, first } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';
import { BranchService } from '../../branch/services/branch.service';

import { AppConst } from 'app/shared/AppConst';

import { User } from '../user.model';
import { Branch } from '../../branch/branch.model';
import { Role } from '../../role/role.model';
import { PaginationProp } from 'app/shared/interface/pagination';
import { SortProp } from 'app/shared/interface/sort';
import { RoomService } from '../../room/services/room.service';
import { Room } from '../../room/models/room.model';

@Injectable()
export class UsersService implements Resolve<any> {
    
    private _unsubscribeAll: Subject<any>;

    private users: User[];
    private rooms: Room[];
    private roles: Role[];

    onUsersChanged: BehaviorSubject<any>;
    onUserDependencyChanged: BehaviorSubject<any>;
    onFilterBranchesChanged: BehaviorSubject<any>;
    onRoomsChanged: BehaviorSubject<any>;
    onRoleChanged: BehaviorSubject<any>;

    onUserStatusChanged: Subject<any>;
    onPaginationChanged: Subject<PaginationProp>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onViewLoaderChanged: Subject<any>;
    onFilterChanged: Subject<any>;

    defaultPageIndex: any = 1;
    defaultPageSize: any = 10;
    defaultPageSizeOptions: number[] = [10, 20, 30];

    totalRecords: number;
    totalDisplayRecords: number;
    isFiltered: boolean;
    pagination: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    searchText: string | null = null;

    viewParent: boolean;

    currentUser: User;
    currentPageIndex: any = 1;
    selectedUser: User[];
    onCurrentUserChanged: Subject<any>;
    onListViewItemChanged: Subject<any>;

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
        private _logger: NGXLogger,
        private _branchService: BranchService,
        private _roomService: RoomService
    )
    {
        // Set the defaults
        this.totalRecords = 0;
        this.totalDisplayRecords = 0;
        this.isFiltered = false;

        this.onUsersChanged = new BehaviorSubject([]);
        this.onUserDependencyChanged = new BehaviorSubject([]);
        this.onFilterBranchesChanged = new BehaviorSubject([]);
        this.onRoomsChanged = new BehaviorSubject([]);
        this.onRoleChanged = new BehaviorSubject([]);

        this.onUserStatusChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onFilterChanged = new Subject();

        this._unsubscribeAll = new Subject();

        this.onCurrentUserChanged = new Subject();
        this.onListViewItemChanged = new Subject();
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
            if (this._authService.isAdmin())
            {
                resolve();
            }
            else if (this._authService.isOwner())
            {
                forkJoin([
                    this.getAllRooms(),
                    this.getDependency(),
                    this._branchService
                        .getBranchesByUser()
                        .pipe(
                            map(response => !_.isEmpty(response) ? response.map((i: any, idx: number) => new Branch(i, idx)) : []),
                            takeUntil(this._unsubscribeAll),
                            switchMap(branches =>
                            {
                                if (branches.length > 0)
                                {
                                    this.onFilterBranchesChanged.next(branches);

                                    return this.getUsers(_.isNull(this.filterBy) ? _.head(branches)['id'] : null).pipe(takeUntil(this._unsubscribeAll));
                                }
                                else
                                {
                                    return of([]);
                                }
                            })
                        )
                ])
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(([rooms, dependencies, users]: [any,any, any]) => 
                    {
                        this.setEvents(rooms, users, dependencies);

                        resolve();
                    }, reject);
            }
            else if (this._authService.isAdministrative())
            {
                this.viewParent = state.url !== '' && state.url.indexOf('/manage-parents') > -1 ? true : false;
                
                forkJoin([
                    this.getAllRooms(),                    
                    this.getUsers(null),
                    this.getRoles()
                ])
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(([rooms, users, roles]: [any, any, any]) =>
                    {
                        this.setEvents(rooms,users);

                        resolve();
                    }, reject);
            }
            else
            {
                reject();
            }
        });
    }

    /**
     * set events after resolve
     */
    setEvents(rooms: Room[] = [], users: User[] = [], dependencies: any = null): void
    {
        if (!_.isNull(dependencies))
        {
            this.onUserDependencyChanged.next(dependencies);
        }
        // this.rooms = rooms;
        // this.onRoomsChanged.next([...this.rooms]);
        this.onUsersChanged.next(users);

        this.onSearchTextChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(searchText =>
            {
                this.searchText = searchText;
                this.defaultPageIndex = 1;
                this.onChangeUsers();
            });

        this.onSortChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(sort =>
            {
                this.sortBy = sort;
                this.defaultPageIndex = 1;
                this.onChangeUsers();
            });

        this.onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(filter =>
            {
                this.filterBy = filter;
                this.defaultPageIndex = 1;

                // reset page index
                if (!_.isNull(this.pagination))
                {    
                    this.pagination.page = this.defaultPageIndex;
                }

                this.onChangeUsers();
            });

        this.onPaginationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(pagination => {

                this.pagination = pagination;
                this.onChangeUsers();
            });

            
    }

    /**
     * get all room list
     *
     * @returns {Promise<any>}
     */
    getAllRooms(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-rooms`)
            .pipe(
                map(response =>
                    {
                        this.rooms = response.data.map((i: any, idx: number) => new Room(i, idx));

                        return {
                            items: this.rooms
                        };
                    }),
                    shareReplay()
            )
            .subscribe(
                (response: any) =>
                {
                    this.onRoomsChanged.next(response);

                    resolve();
                },
                reject
            );
        });
        
    }

    /**
     * get all room list
     *
     * @returns {Promise<any>}
     */
     getRoles(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-role-list`, {})
            .pipe(
                map(response =>
                    {
                        this.roles = response.data.map((i: any, idx: number) => new Role(i, idx));

                        return {
                            items: this.roles
                        };
                    }),
                    shareReplay()
            )
            .subscribe(
                (response: any) =>
                {
                    this.onRoleChanged.next(response);

                    resolve();
                },
                reject
            );
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
    getUsers(index: string = null): Observable<any>
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
            .set('search', this.searchText)
            .set('sort', JSON.stringify(this.sortBy))
            .set('filters', JSON.stringify(_.isNull(index) ? this.filterBy : { branch: index }));

        if (typeof this.viewParent !== 'undefined')
        {
            params = params.set('view-parent', this.viewParent ? '1' : '0')
                                        .set('parents-only','1' );
        }

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-user-list`, { params })
            .pipe(
                map(response =>
                {
                    this.users = response.data.map((i: any, idx: number) => new User(i, idx));

                    this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                    this.totalRecords = response.totalRecords;
                    this.isFiltered = response.filtered;

                    return {
                        items: _.keys(response).length < 1 || (response.data && response.data.length < 1) ? [] : [...this.users],
                        totalDisplay: this.totalDisplayRecords,
                        total: this.totalRecords,
                        filtered: this.isFiltered
                    };
                }),
                finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    /**
     * get user dependency
     *
     * @returns {Observable<any>}
     */
    getDependency(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/user-data`, {})
            .pipe(
                map(response =>
                {
                    if ((response.data && _.keys(response.data).length < 1) || response.data.roles.length < 1 || response.data.branches.length < 1 || response.data.rolelevels.length < 1)
                    {
                        return {};
                    }
                    else
                    {
                        return {
                            roles: response.data.roles.map((i: any, idx: number) => new Role(i, idx)),
                            branches: response.data.branches.map((i: any, idx: number) => new Branch(i, idx)),
                            levels: response.data.rolelevels
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * Get user list
     *
     * @returns {Promise<any>}
     */
    onChangeUsers(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.getUsers()
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((response: any) =>
                {
                    this.onUsersChanged.next(response);

                    resolve();
                }, reject);
        });
    }

    /**
     * Create new user
     *
     * @returns {Observable<any>}
     */
    storeUser(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-branch`, data)
            .pipe(
                map(response =>
                {
                    // if(response.data && _.keys(response.data).length > 0)
                    // {
                    //     let item = new User(response.data);
                    //     item.isNew = true;

                    //     this.branches = this.branches.concat(item);

                    //     setTimeout(() => this.onUserChanged.next([...this.branches]), 350);
                    // }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * Get user item
     *
     * @returns {Observable<any>}
     */
    getUser(index: string): Observable<any>
    {
        const params = new HttpParams()
            .set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-user-info`, { params })
            .pipe(
                map(response => new User(response.data)),
                shareReplay()
            );
    }

    /**
     * Update user item
     *
     * @returns {Observable<any>}
     */
    updateUser(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-user`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        const item = new User(response.data);

                        const index = this.users.findIndex(val => val.id === item.id);

                        item.index = this.users[index].index;
                        this.users[index] = item;

                        setTimeout(() => this.onUsersChanged.next({
                            items: [...this.users],
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        }), 500);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

        /**
     * Update user item
     *
     * @returns {Observable<any>}
     */
    updateSingleUser(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-user`, data)
            .pipe(
                map(response => 
                    {
                        if (response.data && _.keys(response.data).length > 0)
                        {
                            return {
                                item: new User(response.data),
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
    generatePin(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/generate-pi-user`, data)
            .pipe(
                map(response => 
                    {
                        if (response.data && _.keys(response.data).length > 0)
                        {
                            return {
                                item: new User(response.data),
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

    deleteUserImageOnly(data: object): Observable<any>{
        return this._httpClient
            .post<any>(
                `${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-staff-image`,data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        return {
                            item: new User(response.data),
                            message: response.message
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * Delete a user
     *
     * @returns {Observable<any>}
     */
    deleteUser(index: string): Observable<any>
    {
        this.onViewLoaderChanged.next(true);

        const params = new HttpParams()
            .set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-user`, { params })
            .pipe(
                map(response => response.message),
                finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    /**
     * Update user status
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    updateStatus(data: object, index: number): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-user-status`, data)
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        // filter by status
                        if (!_.isNull(this.filterBy) && this.filterBy.status && this.filterBy.status !== '0')
                        {
                            this.onChangeUsers();
                        }
                        else
                        {
                            const item = new User(response.data);

                            setTimeout(
                                () =>
                                    this.onUserStatusChanged.next({
                                        status: item.status,
                                        position: index
                                    }),
                                200
                            );
                        }
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    setCurrentUser(id: string): void
    {
        this.currentUser = this.users.find(c => c.id === id);
       
        this.onCurrentUserChanged.next(this.currentUser);
    }

    setCurrentPageIndex(id: string): void
    {
        this.currentPageIndex = id;
    }

    setDefaultPageIndex(id: string): void
    {
        this.defaultPageIndex = id;
    }

    hasUsers(): boolean
    {
        return this.users && this.users.length > 0;
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
        this.defaultPageIndex = 1;
    }

    /**
     * Create new parent
     * 
     * @returns {Observable<any>}
     */
    storeParent(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-user`, data)
            .pipe(
                map(response =>
                {
                    // reset pagination
                    this.pagination = null;
                    
                    this.onPaginationChanged.next({
                        page: this.defaultPageIndex,
                        size: this.defaultPageSize
                    });

                    return response;
                }),
                shareReplay()
            );
    }


    getUsersAll(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-all-user-parents`)
                .pipe(
                    map((response: any) => response.data.map((i, idx) => new User(i))),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>  resolve(response),
                    reject
                );
            
        });
    }

    sendBulkInvitation(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/send-bulk-invitation`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }
    
}

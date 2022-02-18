import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { Room } from '../models/room.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Resolve } from '@angular/router';
import { takeUntil, map, shareReplay, finalize } from 'rxjs/operators';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { SortProp } from 'app/shared/interface/sort';
import { User } from '../../user/user.model';

@Injectable()
export class RoomService implements Resolve<any> {

    onRoomChanged: BehaviorSubject<any>;
    onRoomChangedUpdated: Subject<any>;
    onRoomStatusChanged: Subject<any>;
    onPaginationChanged: Subject<any>;
    onSearchTextChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    onFilterChanged: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    onRoomStore: Subject<any>;
    onRoomDelete: Subject<any>;

    private _unsubscribeAll: Subject<any>;

    private rooms: Room[];

    defaultPageIndex: any = 1;
    defaultPageSize: any = 10;
    defaultPageSizeOptions: number[] = [8, 16, 20];

    totalItems = 0;
    pagination: any | null = null;
    filterBy: any = '0';
    sortBy: any | null = null;
    searchText: string | null = null;
    totalRecords = 0;
    totalDisplayRecords = 0;
    isFiltered = false;
    // loadingData : boolean = false;

    /**
         * Constructor
         *
         * @param {HttpClient} _httpClient
         * @param {NGXLogger} _logger
         */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger
    ) {
        // Set the defaults
        // this.loadingData = false;
        this.onRoomChanged = new BehaviorSubject([]);
        this.onRoomStatusChanged = new Subject();
        this.onRoomChangedUpdated = new Subject();

        this.onSearchTextChanged = new Subject();
        this.onSortChanged = new Subject();
        this.onFilterChanged = new Subject();
        this.onPaginationChanged = new Subject();
        this.onTableLoaderChanged = new Subject();
        this.onRoomStore = new Subject();
        this.onRoomDelete = new Subject();

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

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {
        return new Promise((resolve, reject) => {
            Promise.all([
                this.getRooms()
            ])
                .then(([rooms]: [any]) => {
                    this.onSearchTextChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(searchText => {
                            this.searchText = searchText;
                            // this.loadingData = true;
                            this.getRooms();
                            // this.pagination.page=this.defaultPageIndex;
                        });

                    this.onFilterChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(filter => {
                            this.filterBy = filter.status;
                            // reset page index
                            if (!_.isNull(this.pagination)) {
                                this.pagination.page = this.defaultPageIndex;
                            }

                            this.getRooms();
                        });

                    this.onRoomStatusChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((res: any) => {
                            if (this.filterBy !== '0') {
                                // if (!_.isNull(this.pagination)) {
                                //     this.pagination.page=this.defaultPageIndex;
                                // }
                                this.pagination.page = this.defaultPageIndex;
                                this.getRooms();
                            }
                        });

                    this.onRoomChangedUpdated
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((res: any) => {
                            // this.getRooms();
                            // if (this.filterBy!=='0') {
                            //     this.getRooms();
                            // }
                            // if (!_.isNull(this.pagination)) {
                            //     this.pagination.page=this.defaultPageIndex;
                            // }
                            this.pagination.page = this.defaultPageIndex;
                            this.getRooms();

                        });

                    this.onPaginationChanged
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(pagination => {
                            this.pagination = pagination;
                            this.getRooms();
                        });

                    this.onRoomStore
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(pagination => {
                            this.pagination.page = this.defaultPageIndex;
                            this.getRooms();
                        });

                    this.onRoomDelete
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(() => {
                            this.pagination.page = this.defaultPageIndex;
                            this.getRooms();
                        });

                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * get User dependency
     *
     * @returns {Observable<any>}
     */
    getDependency(): Observable<any> {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/staff-list`, {})
            .pipe(
                map(depends => {
                    if (depends.data && _.keys(depends.data).length < 1) {
                        return {};
                    }
                    else {
                        return {
                            staffList: depends.data.map((i: any, idx: number) => new User(i, idx))
                        };
                    }
                }),
                shareReplay()
            );
    }

    /**
     * get all room list
     *
     * @returns {Promise<any>}
     */
    getRooms(): Promise<any> {
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
                .set('page', this.pagination.page)
                .set('offset', this.pagination.size)
                .set('search', this.searchText)
                .set('sort', JSON.stringify(this.sortBy))
                .set('filters', JSON.stringify(this.filterBy));

            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-list-room`, { params })
                .pipe(
                    map(response => {
                        this.rooms = response.data.map(i => new Room(i));

                        this.totalDisplayRecords = response.meta ? response.meta.total : 0;
                        this.totalRecords = response.totalRecords;
                        this.isFiltered = response.filtered;
                        // this.loadingData=false;
                        return {
                            items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : this.rooms,
                            totalDisplay: this.totalDisplayRecords,
                            total: this.totalRecords,
                            filtered: this.isFiltered
                        };
                    }),

                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) => {
                        // this.rooms=response.data.map(i => new Room(i));
                        this.onRoomChanged.next(response);
                        resolve();
                    },
                    reject
                );
        });
    }

    /**
     * get all rooms
     *
     * @returns {Observable<any>}
     */
    getAllRooms(): Observable<any>
    {
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-rooms`, {})
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Room(i, idx))),
                shareReplay()
            );
    }

    /**
     * cerate new room
     *
     * @param {object} data
     * @returns {Observable<any>}
     */
    storeRoom(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/store-room`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        this.getRooms();
                        // let item=new Room(response.data);
                        // item.isNew=true;
                        // this.rooms = this.rooms.concat(item);
                        // this.totalRecords=response.data.totalRecords;
                        // this.filterBy = '0'

                        // setTimeout(() => {
                        //     this.onRoomStore.next({
                        //         items: this.rooms,
                        //         total: this.rooms.length
                        //     })
                        //     this.onFilterChanged.next(this.filterBy)
                        // }, 500);

                        // setTimeout(() => this.onRoomChanged.next([...this.rooms]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
    * Update room status
    *
    * @param {object} data
    * @returns {Observable<any>}
    */
    updateStatus(data: object, index: number): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-room-status`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        const item = new Room(response.data);

                        setTimeout(() => this.onRoomStatusChanged.next({ status: item.status, position: index }), 200);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     *  Add Room Capacity Record
     *
     * @param {object} data
     * @returns {Observable<any>}
    * */
    addCapacity(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-capacity`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {

                        setTimeout(() => this.onRoomChangedUpdated.next([...this.rooms]), 350);
                    }

                    return response.data.capacity;
                }),
                shareReplay()
            );
    }

    /**
    * Get room item
    * 
    * @returns {Observable<any>}
    */
    getRoom(index: string): Observable<any> {
        const params = new HttpParams().set('index', index);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-room-info`, { params })
            .pipe(
                map(rooms => new Room(rooms.data)),
                shareReplay()
            );
    }

    /**
     * Update room item
     * 
     * @returns {Observable<any>}
     */
    updateRoom(data: object): Observable<any> {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-room`, data)
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        // this.getRooms()
                        // this.pagination.page=this.defaultPageIndex;
                        // let roomData=new Room(response.data);
                        // roomData.isNew=true;

                        // if (this.filterBy ==='0') {
                        //     const index=this.rooms.findIndex((val) => val.id===roomData.id);
                        //     this.rooms[index]=roomData;
                        // }
                        // setTimeout(() => this.onRoomChanged.next({
                        //     items: this.rooms,
                        //     total: this.totalRecords
                        // }), 500);

                        setTimeout(() => this.onRoomChangedUpdated.next([...this.rooms]), 350);
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
    * Delete a room
    * 
    * @returns {Observable<any>}
    */
    deleteRoom(index: string): Observable<any> {
        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-room`, { params })
            .pipe(
                map(response => {
                    this.rooms = this.rooms.filter((i) => i.id !== index);
                    this.totalRecords = response.data.totalRecords;

                    setTimeout(() => this.onRoomDelete.next({
                        items: this.rooms,
                        total: this.totalRecords
                    }), 500);

                    return response.message;
                }),
                shareReplay()
            );
    }

    /**
     * reset all variables
     */
    resetDeclarations(): void
    {
        this.pagination = null;
        this.filterBy = '0';
        this.sortBy = null;
        this.searchText = null;
        this.totalItems = 0;
        this.totalDisplayRecords = 0;
        this.totalRecords = 0;
        this.isFiltered = false;
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();
    }

}

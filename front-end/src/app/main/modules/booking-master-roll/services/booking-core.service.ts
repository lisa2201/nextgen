import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { ChildrenService } from '../../child/services/children.service';
import { RoomService } from '../../room/services/room.service';

import { Booking } from '../../child/booking/booking.model';
import { Room } from '../../room/models/room.model';
import { Child } from '../../child/child.model';
import { Fee } from '../../centre-settings/fees/model/fee.model';
import { SortProp } from 'app/shared/interface/sort';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';

@Injectable()
export class BookingMasterRollCoreService
{
    private _unsubscribeAll: Subject<any>;

    private bookings: Booking[];
    private rooms: Room[];
    private children: Child[];
    private fees: Fee[];

    onChildrenChanged: BehaviorSubject<any>;
    onChildrenBookingChanged: BehaviorSubject<any>;
    onRoomsChanged: BehaviorSubject<any>;
    onFeeChanged: BehaviorSubject<any>;

    onCalendarDateChanged: Subject<any>;
    onViewLoaderChanged: Subject<any>;
    onCalendarBuildChanged: Subject<any>;
    broadcastChildSelection: Subject<any>;

    onFilterChanged: Subject<any>;
    onSortChanged: Subject<SortProp>;
    setOccupancyRoom: Subject<any>;
    disableBookingActions: Subject<any>;
    occupancyToggleChange: Subject<any>;

    triggerOccupancyBookingDateChange: Subject<any>;

    triggerInitialBooking: Subject<boolean>;
    isChildrenViewLimited: Subject<boolean>;
    resetBaseFilterOptions: Subject<any>;
    resetFilterFormValues: Subject<any>;

    setRoomFilter: Subject<any>;

    dateParams: any | null = null;
    filterBy: any | null = null;
    sortBy: any | null = null;
    occupancyViewVisible: boolean;

    calenderSettings = {
        hideWeekEnd: true
    };

    viewHolderId: string;
    eventLoadedInitially: boolean;
    
    /**
     * Constructor
     * 
     * @param {HttpClient} _httpClient
     * @param {ChildrenService} _childrenService
     * @param {RoomService} _roomService
     */
    constructor(
        private _httpClient: HttpClient,
        private _childrenService: ChildrenService,
        private _roomService: RoomService
    )
    {
        // Set the defaults
        this.onChildrenChanged = new BehaviorSubject([]);
        this.onChildrenBookingChanged = new BehaviorSubject([]);
        this.onRoomsChanged = new BehaviorSubject([]);
        this.onFeeChanged = new BehaviorSubject([]);

        this.onCalendarDateChanged = new Subject();
        this.onViewLoaderChanged = new Subject();
        this.onCalendarBuildChanged = new Subject();
        this.broadcastChildSelection = new Subject();
        
        this.onFilterChanged = new Subject();
        this.onSortChanged = new Subject();
        this.setOccupancyRoom = new Subject();
        this.disableBookingActions = new Subject();
        this.occupancyToggleChange = new Subject();

        this.triggerOccupancyBookingDateChange = new Subject();

        this.triggerInitialBooking = new Subject();
        this.isChildrenViewLimited = new Subject();
        this.resetBaseFilterOptions = new Subject();
        this.resetFilterFormValues = new Subject();

        this.setRoomFilter = new Subject();

        this._unsubscribeAll = new Subject();

        this.occupancyViewVisible = false;
        this.viewHolderId = null;
        this.eventLoadedInitially = false;
    }

    /**
     * set current component name
     *
     * @param {string} id
     */
    setViewHolder(id: string): void
    {
        this.viewHolderId = id;
    }

    /**
     * cross check the component name
     *
     * @param {string} currentHolder
     * @returns {boolean}
     */
    isValidViewHolder(currentHolder: string): boolean
    {
        return this.viewHolderId === currentHolder;
    }

    /**
     * set events after resolve
     */
    setEvents(dependencies: { fees: Fee[], children: Child[], rooms: Room[], abs_reason: any } = null): void
    {
        if (!_.isEmpty(dependencies))
        {
            this.children = dependencies.children; 
            this.onChildrenChanged.next([...this.children]);

            this.rooms = dependencies.rooms;
            this.onRoomsChanged.next([...this.rooms]);

            this.fees = dependencies.fees;
            this.onFeeChanged.next([...this.fees]);
        }

        if (!this.eventLoadedInitially)
        {
            this.onCalendarDateChanged
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(value =>
                {
                    if (_.isNull(value))
                    {
                        return;
                    }
    
                    this.dateParams = {
                        start: value.start,
                        end: value.end
                    };
    
                    if (this.occupancyViewVisible)
                    {
                        this.triggerOccupancyBookingDateChange.next(true);
                    }
    
                    this.getBookings();
                });
    
            this.onFilterChanged
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(filter =>
                {
                    this.filterBy = filter;
    
                    this.getBookings();
                });
    
            this.onSortChanged
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(sort =>
                {
                    this.sortBy = sort;
    
                    this.getBookings();
                });
    
            this.occupancyToggleChange
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(value => this.occupancyViewVisible = value);
            
            this.eventLoadedInitially = true;
        }
    }

    /**
     * reset service events
     */
    resetEvents(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // this.onCalendarDateChanged = new Subject();
        // this.onFilterChanged = new Subject();
        // this.onSortChanged = new Subject();
        // this.occupancyToggleChange = new Subject();

        // this.setOccupancyRoom = new Subject();
        // this.disableBookingActions = new Subject();
        // this.occupancyToggleChange = new Subject();
    }

    /**
     * get bookings
     *
     * @returns {Promise<any>}
     */
    getBookings(notifiable: boolean = true): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            // set view loader
            this.onViewLoaderChanged.next(true);

            const params = new HttpParams()
                .set('start', this.dateParams ? this.dateParams.start : DateTimeHelper.now().startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly))
                .set('end', this.dateParams ? this.dateParams.end : DateTimeHelper.now().endOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly))
                .set('filters', notifiable ? JSON.stringify(this.filterBy) : null);
                
            return this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-master-roll-list`, { params })
                .pipe(
                    map(response => response.data),
                    finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                    shareReplay()
                )
                .subscribe(
                    (response: any) =>
                    {
                        this.bookings = response.map((i: any, idx: number) => new Booking(i, idx));

                        if (notifiable)
                        {
                            this.onChildrenBookingChanged.next([...this.bookings]);
                        }

                        resolve([...this.bookings]);
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
    getRooms(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._roomService
                .getAllRooms()
                .pipe(first())
                .subscribe(
                    (response: Room[]) =>
                    {
                        this.rooms = response;

                        this.onRoomsChanged.next(this.rooms);
                        
                        resolve(this.rooms);
                    },
                    reject
                );
        });
    }

    /**
     * get all children's
     * 
     * @returns {Promise<any>}
     */
    getChildren(): Promise<any>
    {
        return new Promise((resolve, reject) => 
        {
            this._childrenService
                .getChildrenList()
                .pipe(first())
                .subscribe(
                    (response: Child[]) =>
                    {
                        this.children = response;

                        this.onChildrenChanged.next(this.children);
                        
                        resolve(this.children);
                    },
                    reject
                );
        });
    }

    /**
     * get booking dependency
     *
     * @param {string} type
     * @param {*} [getAbsReason=false]
     * @param {string} [id=null]
     * @returns {Observable<any>}
     */
    getDependency(type: string, getAbsReason: any = false, id: string = null): Observable<any>
    {
        let params = new HttpParams()
            .set('type', type);

        if (getAbsReason)
        {
            params = params.set('abs_reason', getAbsReason);
        }

        if(!_.isNull(id))
        {
            params = params.set('ref', id);
        }

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/master-roll-data`, { params })
            .pipe(
                map(response =>
                {
                    if (response.data && _.keys(response.data).length < 1 || (response.data.children.length < 1 || response.data.rooms.length < 1 || response.data.fees.length < 1))
                    {
                        return {};
                    }
                    else
                    {
                        const object = {
                            children: response.data.children.map((i: any, idx: number) => new Child(i, idx)),
                            rooms: response.data.rooms.map((i: any, idx: number) => new Room(i, idx)),
                            fees: response.data.fees.map((i: any, idx: number) => new Fee(i, idx)),
                        };

                        if (getAbsReason) object['abs_reason'] = response.data.abs_reason || [];

                        return object;
                    }
                }),
                shareReplay()
            );
    }

    /**
     * get preview booking time slots
     * 
     * @returns {Observable<any>}
     */
    getPreviewSlots(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/master-roll-preview`, data)
            .pipe(
                map(response => response.data),
                shareReplay()
            );
    }

    /**
     * get update preview booking slots
     * 
     * @returns {Observable<any>}
     */
    getManagerPreviewSlots(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/master-roll-manage-preview`, data)
            .pipe(
                map(response => response.data),
                shareReplay()
            );
    }

    /**
     * Create bookings
     * 
     * @returns {Observable<any>}
     */
    storeBookings(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-master-roll-bookings`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * Manage bookings (update/delete)
     * 
     * @returns {Observable<any>}
     */
    manageBookings(data: object): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/manage-master-roll-bookings`, data)
            .pipe(
                map(response => response.message),
                shareReplay()
            );
    }

    /**
     * get room occupancy
     *
     * @returns {Observable<any>}
     */
    getOccupancy(): Observable<any>
    {
        // set view loader
        this.onViewLoaderChanged.next(true);

        const params = new HttpParams()
            .set('start', this.dateParams ? this.dateParams.start : DateTimeHelper.now().startOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly))
            .set('end', this.dateParams ? this.dateParams.end : DateTimeHelper.now().endOf('isoWeek').format(AppConst.dateTimeFormats.dateOnly));

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-master-roll-occupancy`, { params })
            .pipe(
                map(response => response.data.map((i: any, idx: number) => new Booking(i, idx))),
                finalize(() => setTimeout(() => this.onViewLoaderChanged.next(false), 200)),
                shareReplay()
            );
    }

    /**
     * set initial booking loader
     *
     * @param {Child[]} children
     * @param {Room[]} rooms
     */
    setInitialBookingView(children: Child[], rooms: Room[]): void
    {
        this.triggerInitialBooking.next(true);

        if (children.length <= 150) 
        { 
            this.isChildrenViewLimited.next(false);

            this.setOccupancyRoom.next('0'); 
        } 
        else 
        { 
            this.isChildrenViewLimited.next(true);

            this.setOccupancyRoom.next(_.head(rooms).id); 
        }
    }

    /**
     * clear service variables
     */
    resetVariables(): void
    {
        this.dateParams = null;
        this.filterBy = null;
        this.sortBy = null;

        this.resetBaseFilterOptions.next(this.filterBy);

        this.onChildrenChanged.next([]);
        this.onChildrenBookingChanged.next([]);
        this.onRoomsChanged.next([]);
        this.onFeeChanged.next([]);
    }
    
    /**
     * Unsubscribe options
     */
    unsubscribeOptions(): void
    {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        // reinitialize 
        this._unsubscribeAll = new Subject();

        //
        this.bookings = [];
        this.children = [];
        this.rooms = [];
        this.fees = [];

        // reset all variables
        this.resetVariables();

        // clear on component destroy
        this.occupancyViewVisible = false;
        this.viewHolderId = null;
        this.eventLoadedInitially = false;
    }
}
import { Component, OnInit, ViewEncapsulation, OnDestroy, Input, EventEmitter, Output, AfterViewInit } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { ChildBookingService } from 'app/main/modules/child/booking/services/booking.service';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';

import { AuthClient } from 'app/shared/model/authClient';
import { Child } from 'app/main/modules/child/child.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { ViewBookingHistoryComponent } from '../../dialogs/view-booking-history/view-booking-history.component';

export interface BookingHistoryItem {
    startDate: string;
    endDate: string;
    fees: Fee[];
    rooms: Room[];
    days: any;
    isCasual: boolean;
    bookings: Booking[];
}

@Component({
    selector: 'child-booking-view-history',
    templateUrl: './view-history.component.html',
    styleUrls: ['./view-history.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildBookingViewHistoryComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    activeBookingHistoryList: BookingHistoryItem[];
    trashedBookingHistoryList: BookingHistoryItem[];

    dialogRef: any;

    @Input() children: Child[];

    @Input() showAction: boolean = false;

    @Output()
    updateLoadingStatus: EventEmitter<boolean>;

    @Output()
    listItemSelect: EventEmitter<{ action: string, item: BookingHistoryItem }>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     * @param {ChildBookingService} _bookingService
     * @param {CommonService} _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _bookingService: ChildBookingService,
        private _commonService: CommonService,
        private _matDialog: MatDialog
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.activeBookingHistoryList = [];
        this.trashedBookingHistoryList = [];

        this.updateLoadingStatus = new EventEmitter();
        this.listItemSelect = new EventEmitter();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child booking history view !!!', this.children);
    }

    /**
     * Respond after initializes the component's views
     */
    ngAfterViewInit(): void 
    {
        // load child booking history
        if(this.children.length === 1) 
        {
            setTimeout(() => this.getBookingHistory(_.head(this.children).id));
        }
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.updateLoadingStatus.unsubscribe();

        this.listItemSelect.unsubscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * get child booking history
     *
     * @param {string} childId
     */
    getBookingHistory(childId: string): void
    {
        this.updateLoadingStatus.emit(true);

        this._bookingService
            .getBookingHistory(childId)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.updateLoadingStatus.emit(false))
            )
            .subscribe(
                res => 
                {
                    if(_.isEmpty(res))
                    {
                        return;
                    }
                    
                    this.buildBookingHistoryList(res);
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * format and build history list
     *
     * @param {[{ group: string, bookings: Booking[] }]} list
     */
    buildBookingHistoryList(list: [{ group: string, bookings: Booking[] }]): void
    {        
        for (const item of list)
        {
            // active list
            const activeGroup = _.groupBy(_.sortBy(item.bookings.filter(i => _.isNull(i.deletedAt)), 'date'), (i) => i.createdAt);
            // const activeGroup = _.groupBy(_.sortBy(item.bookings, 'date'), (i) => i.updatedAt);

            for (const row in activeGroup)
            {
                const adjustedGroup: object = (activeGroup[row].some(b => !_.isNull(b.adjustedFee))) ? _.groupBy(activeGroup[row], (b: Booking) => !_.isNull(b.adjustedFee) && b.adjustedFee.id && b.adjustedFee.netAmount) : {};

                if (!_.isEmpty(adjustedGroup))
                {
                    for (const adjusted in adjustedGroup) this.activeBookingHistoryList.push(this.formatBookingHistoryItem(adjustedGroup[adjusted]));
                }
                else
                {
                    this.activeBookingHistoryList.push(this.formatBookingHistoryItem(activeGroup[row]));
                }
            }   

            // deleted list
            const deletedGroup = _.groupBy(_.sortBy(item.bookings.filter(i => !_.isNull(i.deletedAt)), 'date'), (i) => i.deletedAt);

            for (const row in deletedGroup) 
            {
                const adjustedDeletedGroup: object = (deletedGroup[row].some(b => !_.isNull(b.adjustedFee))) ? _.groupBy(deletedGroup[row], (b: Booking) => !_.isNull(b.adjustedFee) && b.adjustedFee.id && b.adjustedFee.netAmount) : {};

                if (!_.isEmpty(adjustedDeletedGroup))
                {
                    for (const adjusted in adjustedDeletedGroup) this.trashedBookingHistoryList.push(this.formatBookingHistoryItem(adjustedDeletedGroup[adjusted]));
                }
                else
                {
                    this.trashedBookingHistoryList.push(this.formatBookingHistoryItem(deletedGroup[row]));
                }
            }
        }
        
        // order by date
        this.activeBookingHistoryList = _.orderBy(this.activeBookingHistoryList, [i => i.startDate], ['desc']); 
        this.trashedBookingHistoryList = _.orderBy(this.trashedBookingHistoryList, [i => i.startDate], ['desc']); 
    }

    /**
     * format booking history list item
     *
     * @param {Booking[]} groupItem
     * @returns {BookingHistoryItem}
     */
    formatBookingHistoryItem(groupItem: Booking[]): BookingHistoryItem
    {
        return {
            startDate: _.head(groupItem).date,
            endDate: _.last(groupItem).date,
            fees: _.uniqBy(groupItem.map(i => i.fee), 'id'),
            rooms: _.uniqBy(groupItem.map(i => i.room), 'id'),
            days: this.getBookingDays(_.uniqBy(_.orderBy(groupItem, [i => i.day], ['desc']), 'day')).map((i: { name: string; }) => _.capitalize(i.name).substring(0,3)).join(', '),
            isCasual: _.head(groupItem).isCasual,
            bookings: groupItem
        };
    }

    /**
     * join array properties
     *
     * @param {*} items
     * @param {string} property
     * @param {string} [separator=', ']
     * @returns {string}
     */
    joinArrayProperties(items: any, property: string, separator: string = ', '): string
    {
        return _.join(items.map((i: any) => i[property]), separator);
    }

    /**
     * get booking from fee
     *
     * @param {Booking[]} bookings
     * @param {string} feeId
     * @returns {Booking}
     */
    getFeeByBooking(bookings: Booking[], feeId: string): Booking
    {
        return (bookings.filter(i => i.fee.id === feeId).length > 0) ? _.head(bookings.filter(i => i.fee.id === feeId)) : null;
    }

    /**
     * get booking days
     *
     * @param {*} bookingDays
     * @returns {*}
     */
    getBookingDays(bookingDays: any): any
    {
        return _.sortBy(this._commonService.getWeekDays({ hideWeekEnd: false, weekStartsAt: 1 }).filter((d: { name: string; }) => bookingDays.map((i: { day: string; }) => _.lowerCase(i.day)).indexOf(_.lowerCase(d.name)) > -1), 'index');
    }

    /**
     * toggle action button operations
     *
     * @param {MouseEvent} e
     * @param {BookingHistoryItem} item
     * @param {string} action
     */
    toggleAction(e: MouseEvent, item: BookingHistoryItem, action: string): void
    {
        e.preventDefault();

        this.listItemSelect.emit({ action: action, item: item });
    }

    /**
     * view all bookings
     *
     * @param {MouseEvent} e
     * @param {BookingHistoryItem} item
     */
    viewBookingDetails(e: MouseEvent, item: BookingHistoryItem): void
    {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(ViewBookingHistoryComponent,
            {
                panelClass: 'view-booking-history-modal',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
                    history: item
                }
            });
        
    }
}

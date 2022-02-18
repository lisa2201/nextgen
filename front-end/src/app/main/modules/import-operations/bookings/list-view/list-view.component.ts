import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { finalize } from 'rxjs/internal/operators/finalize';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';
import { NzModalService, NzModalRef } from 'ng-zorro-antd/modal';

import { CommonService } from 'app/shared/service/common.service';
import { ImportBookingService } from '../services/import-bookings.service';

import { Child } from 'app/main/modules/child/child.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';

export interface BookingImportListItem {
    child: Child | null;
    childLabel: string | null;
    room: Room | null;
    fee: Fee | null;
    schedule: Array<string> | [];
    dates: Array<any>
    hasError: boolean;
    response: any;
}

@Component({
    selector: 'import-bookings-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImportBookingsListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    bookings: any;
    children: Child[];
    fees: Fee[];
    rooms: Room[];

    bookingList: Array<BookingImportListItem>;
    filteredSource: Array<BookingImportListItem>

    selectedBranch: string;
    selectedOrganization: string;
    selectedBookings: any;

    pageSize: number;
    pageNumber: number;
    listViewLoading: boolean;

    viewBookingDatesModal: NzModalRef;

    includeHistory: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _bookingImportService: ImportBookingService,
        private _commonService: CommonService,
        private _modalService: NzModalService
    )
    {
        // set default values
        this.bookings = [];
        this.children = [];
        this.fees = [];
        this.rooms = [];

        this.bookingList = [];
        this.filteredSource = [];

        this.selectedBranch = null;
        this.selectedOrganization = null;
        this.selectedBookings = [];

        this.pageSize = 15;
        this.pageNumber = 1;
        this.listViewLoading = false;

        this.includeHistory = false;

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
        this._logger.debug('import bookings - list view !!!');

        // Subscribe to booking changes
        this._bookingImportService
            .onBookingsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: { list: any, children: Child[], fees: Fee[], rooms: Room[], branch: string, organization: string, csv: any, history: boolean }) =>
            {
                this._logger.debug('[list view - import ccs enrollments]', response);

                this.bookings = response.list;
                this.children = response.children;
                this.fees = response.fees;
                this.rooms = response.rooms;

                this.selectedBranch = response.branch;
                this.selectedOrganization = response.organization;
                this.selectedBookings = response.csv;

                this.includeHistory = response.history;

                this._commonService._updateParentScroll.next();

                setTimeout(() => this.buildList(), 50);
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.viewBookingDatesModal)
        {
            this.viewBookingDatesModal.close();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * update view scroll on tab collapsed
     *
     * @param {boolean} value
     */
    onTabCollapsed(value: boolean): void
    {
        // update parent scroll
        this._commonService._updateParentScroll.next();
    }

    /**
     * get paginate list
     *
     * @param {*} array
     * @param {number} pageSize
     * @param {number} pageNumber
     * @returns {*}
     */
    paginate(array: any, pageSize: number, pageNumber: number): any
    {
        return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    }

    /**
     * on page change
     *
     * @param {number} page
     */
    onPaginateChange(page: number): void
    {
        this.pageNumber = page;

        this.filteredSource = this.paginate(this.bookingList, this.pageSize, this.pageNumber);
    }

    /**
     * get enrolment list
     *
     * @returns {Array<BookingImportListItem>}
     */
    getFilteredSource(): Array<BookingImportListItem>
    {
        return this.paginate(this.bookingList, this.pageSize, this.pageNumber);
    }

    /**
     * get fee info
     *
     * @param {string} value
     * @returns {Fee}
     */
    getFee(value: string): Fee
    {
        return this.fees.find(i => i.id = value);
    }

    /**
     * get room info
     *
     * @param {string} value
     * @returns {Room}
     */
    getRoom(value: string): Room
    {
        return this.rooms.find(i => i.id = value);
    }

    /**
     * get booking dates
     *
     * @param {Array<string>} dateList
     * @returns {string}
     */
    getBookingDateLabel(dateList: Array<string>): string
    {
        return dateList.map(date => `<span class="font-weight-600">${date}</span> (${DateTimeHelper.parseMoment(date).format('dddd')})`).join(', ');
    }

    /**
     * build import list
     */
    buildList(): void
    {
        this.bookingList = [];

        for(const booking of this.bookings)
        {
            // create 
            const listObject: BookingImportListItem = {
                child: booking.child ? this.children.find(i => i.id === booking.child) : null,
                childLabel: booking.response.f_name + ' ' + booking.response.l_name,
                room: booking.room ? this.rooms.find(i => i.id === booking.room) : null,
                fee: booking.fee ? this.fees.find(i => i.id === booking.fee) : null,
                schedule: booking.schedule,
                dates: this.getBookingDates(booking),
                hasError: false,
                response: booking.response
            };

            // check if room assigned to child
            // const childBelongsToRoom = (listObject.child && listObject.room && listObject.child.rooms.length > 0) ? listObject.child.rooms.filter(i => i.id === booking.response.room).length > 0 : false;

            // check for errors
            listObject.hasError = !listObject.child || !listObject.room || !listObject.fee || _.isEmpty(listObject.schedule) || _.isEmpty(listObject.dates);

            // add to list
            this.bookingList.push(listObject);
        }
    }

    /**
     * get booking dates
     *
     * @param {*} data
     * @returns {*}
     */
    getBookingDates(data: any): any
    {
        const list = [];

        const dateRange = DateTimeHelper.getDateRange(DateTimeHelper.parseMoment(data.booking_start), DateTimeHelper.parseMoment(data.booking_end));

        for(const date of dateRange)
        {
            if(_.indexOf(data.schedule, _.toLower(date.format('dddd'))) > -1)
            {
                list.push(date.format(AppConst.dateTimeFormats.dateOnly));
            }
        }

        return list;
        
    }

    /**
     * reload list
     *
     * @returns {Promise<any>}
     */
    refetch(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            const sendObj = {
                org: this.selectedOrganization,
                branch: this.selectedBranch,
                bookings: this.selectedBookings,
                history: this.includeHistory
            };

            this._logger.debug('[import booking object - reload]', sendObj);

            this.listViewLoading = true;

            this._bookingImportService
                .getBookings(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => setTimeout(() => this.listViewLoading = false, 200))
                )
                .subscribe(
                    response =>
                    {
                        this._logger.debug('[list view - import ccs bookings - reload]', response);

                        this._bookingImportService.onBookingsChanged.next({
                            list: response.bookings,
                            children: response.children,
                            fees: response.fees,
                            rooms: response.rooms,
                            branch: this.selectedBranch,
                            organization: this.selectedOrganization,
                            csv: this.selectedBookings,
                            history: this.includeHistory
                        });

                        resolve();
                    },
                    errorRes => reject(errorRes)
                );
        });
    }

    /**
     * get values for migration
     *
     * @returns {*}
     */
    getMigrationValues(): any
    {
        return {
            org: this.selectedOrganization,
            branch: this.selectedBranch,
            list: this.bookingList.map(i => 
                {
                    return {
                        child: i.child ? i.child.id : null,
                        room: i.room ? i.room.id : null,
                        fee: i.fee ? i.fee.id : null,
                        fee_amount: i.fee ? i.fee.netAmount : null,
                        session_start: i.fee ? i.fee.sessionStart : null,
                        session_end: i.fee ? i.fee.sessionEnd : null,
                        dates: i.dates
                    }
                })
        };;
    }

    /**
     * view booking dates
     *
     * @param {MouseEvent} e
     * @param {*} item
     */
    viewBookingDates(e: MouseEvent, item: any): void
    {
        e.preventDefault();

        this.viewBookingDatesModal = this._modalService.create({
            nzTitle: 'Booking Dates',
            nzContent: this.getBookingDateLabel(item.dates),
            nzFooter: [
                {
                    label: 'CLOSE',
                    type: 'danger',
                    onClick: () => this.viewBookingDatesModal.destroy()
                  },
            ]
        })
    }

}

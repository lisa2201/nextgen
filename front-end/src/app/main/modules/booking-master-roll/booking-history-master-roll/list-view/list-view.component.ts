import { Component, OnInit, ViewEncapsulation, OnDestroy, EventEmitter, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MediaObserver, MediaChange } from '@angular/flex-layout';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BookingHistoryService } from '../../services/booking-history.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

import { Booking } from 'app/main/modules/child/booking/booking.model';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'booking-history-list-view',
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
export class BookingHistoryMasterRollListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    bookings: Booking[];

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;

    filterValue: any = null;

    searchInput: FormControl;

    @Output()
    updateTableScroll: EventEmitter<any>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {BookingHistoryService} _historyService
     */
    constructor(
        private _logger: NGXLogger,
        private _historyService: BookingHistoryService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    )
    {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._historyService.defaultPageSize;
        this.pageIndex = this._historyService.defaultPageIndex;
        this.pageSizeOptions = this._historyService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();

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
        this._logger.debug('booking history list view !!!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to children changes
        this._historyService
            .onBookingHistoryChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[on booking history change]', response);  

                this.bookings = response.items;
            });


        // Subscribe to table loader changes
        this._historyService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.tableLoading = value);

        // Subscribe to filter changes
        this._historyService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) =>
            {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._historyService.defaultPageIndex;
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.updateTableScroll.unsubscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * clear search
     *
     * @param {MouseEvent} e
     */
    clearSearch(e: MouseEvent): void
    {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.resetSearch(true);
    }

    /**
     * clear search and sort
     *
     * @param {boolean} [updateView=false]
     */
    resetSearch(updateView: boolean = false): void
    {
        this.searchInput.patchValue('', { emitEvent: false });

        if (updateView)
        {
            this._historyService.onSearchTextChanged.next(this.searchInput.value);
        }
    }

    /**
     * get items for table
     *
     * @param {boolean} [reset=false]
     */
    onTableChange(reset: boolean = false): void
    {
        if (reset)
        {
            this.pageIndex = this._historyService.defaultPageIndex;
        }

        this._historyService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * Toggle sidebar
     *
     * @param name
     */
    toggleSidebar(name: string): void
    {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }
}

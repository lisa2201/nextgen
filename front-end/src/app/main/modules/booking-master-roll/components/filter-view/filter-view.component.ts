import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BookingMasterRollCoreService } from '../../services/booking-core.service';

import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'booking-master-roll-filter-view',
    templateUrl: './filter-view.component.html',
    styleUrls: ['./filter-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingMasterRollFilterViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    isChildrenViewLimited: boolean;
    bookingTypes: typeof AppConst.bookingTypes;

    @Input() isFilterOn: boolean;
    @Input() filterData: any;
    @Input() filterDefaultValues: any;

    @Input() fees: Fee[];

    @Input() rooms: Room[];

    @Input() children: Child[];

    @Input() cssClass: string;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _masterRollService: BookingMasterRollCoreService
    )
    {
        // set default values
        this.isChildrenViewLimited = false;
        this.bookingTypes = AppConst.bookingTypes;

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
        this._logger.debug('master roll - filter view!!!');

        // Subscribe to children view limited changes
        this._masterRollService
            .isChildrenViewLimited
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.isChildrenViewLimited = value);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * get child information
     *
     * @param {string} id
     * @returns {Fee}
     */
    getChildInfo(id: string): Child
    {
        return this.children.find(i => i.id === id);
    }

    /**
     * get room information
     *
     * @param {string} id
     * @returns {Room}
     */
    getRoomInfo(id: string): Room
    {
        return this.rooms.find(i => i.id === id);
    }

    /**
     * get fee information
     *
     * @param {string} id
     * @returns {Fee}
     */
    getFeeInfo(id: string): Fee
    {
        return this.fees.find(i => i.id === id);
    }

    /**
     * get booking type label
     *
     * @param {string} value
     * @returns {string}
     */
    getBookingType(value: string): string
    {
        return _.head(this.bookingTypes.filter(i => i.value === value)).name;
    }

    /**
     * get attendance type label
     *
     * @param {string} value
     * @returns {string}
     */
    getAttendanceType(value: string): string
    {
        return value !== '' ? (value === '0' ? 'Completed' : 'Incomplete') : '';
    }

    /**
     * remove tag
     *
     * @param {string} [type='0']
     */
    onClose(type: string = '0'): void
    {
        switch (type) 
        {
            case '0':
                this._masterRollService.resetFilterFormValues.next(['type', 'attend_type']);
                break;

            case '1':
                this._masterRollService.resetFilterFormValues.next('attend_type');
                break;

            case '2':
                this._masterRollService.resetFilterFormValues.next('room');
                break;

            case '3':
                this._masterRollService.resetFilterFormValues.next('child');
                break;

            case '4':
                this._masterRollService.resetFilterFormValues.next('fee');
                break;
        
            default:
                break;
        }
    }
}

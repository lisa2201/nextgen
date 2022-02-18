import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { BookingMasterRollCoreService } from '../../../services/booking-core.service';

import { Child } from 'app/main/modules/child/child.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { AppConst } from 'app/shared/AppConst';
import { CommonHelper } from 'app/utils/common.helper';

@Component({
    selector: 'manager-master-roll-calender-filter',
    templateUrl: './manager-master-roll-calender-filter.component.html',
    styleUrls: ['./manager-master-roll-calender-filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ManagerMasterRollCalenderFilterComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    children: Child[];
    fees: Fee[];
    rooms: Room[];
    showFilterButton: boolean;
    bookingTypes: typeof AppConst.bookingTypes;
    isChildrenViewLimited: boolean;

    calendarFiltersForm: FormGroup;

    formDefaultValues = {
        type: '',
        attend_type: '',
        child: '0',
        fee: '0',
        room: '0'
    };

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
        this.children = [];
        this.rooms = [];
        this.fees = [];
        this.bookingTypes = AppConst.bookingTypes;
        this.isChildrenViewLimited = false;

        this.calendarFiltersForm = this.createFilterForm();

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
        this._logger.debug('master roll calendar filter !!!');

        // Subscribe to filter form changes
        this.calendarFiltersForm
            .get('type')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by type change]', value);

                this._masterRollService.onFilterChanged.next(this.getFormValues);
            });

        this.calendarFiltersForm
            .get('attend_type')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by attend_type change]', value);

                this._masterRollService.onFilterChanged.next(this.getFormValues);
            });

        this.calendarFiltersForm
            .get('child')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by child change]', value);

                this._masterRollService.onFilterChanged.next(this.getFormValues);
            });

        this.calendarFiltersForm
            .get('fee')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by fee change]', value);

                this._masterRollService.onFilterChanged.next(this.getFormValues);
            });

        this.calendarFiltersForm
            .get('room')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by room change]', value);

                this._masterRollService.onFilterChanged.next(this.getFormValues);
            });

        // Subscribe to children changes
        this._masterRollService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Child[]) =>
            {
                this._logger.debug('[on children change]', response);  
                
                this.children = response;

                this._masterRollService.broadcastChildSelection.next([]);
            });

        // Subscribe to fee list changes
        this._masterRollService
            .onRoomsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Room[]) =>
            {
                this._logger.debug('[on room change]', response);  
                
                this.rooms = response;
            });

        // Subscribe to fee list changes
        this._masterRollService
            .onFeeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Fee[]) =>
            {
                this._logger.debug('[on fee change]', response);  
                
                this.fees = response;
            });
        
        // Subscribe to room occupancy changes
        this._masterRollService
            .setOccupancyRoom
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((id: string) => this.calendarFiltersForm.get('room').patchValue(id));

        // Subscribe to children view limited changes
        this._masterRollService
            .isChildrenViewLimited
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.isChildrenViewLimited = value);

        // Subscribe to form values update change
        this._masterRollService
            .resetFilterFormValues
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.updateFilterValues(value));
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
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.calendarFiltersForm.controls;
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    get getFormValues(): any
    {
        return {
            child: this.fc.child.value,
            type: this.fc.type.value,
            attend_type: this.fc.attend_type.value,
            fee: this.fc.fee.value,
            room: this.fc.room.value
        };
    }

    createFilterForm(): FormGroup
    {
        return new FormGroup({
            type: new FormControl(''),
            attend_type: new FormControl(''),
            child: new FormControl('0'), 
            fee: new FormControl('0'),
            room: new FormControl('0')
        });
    }

    setFilterFormDefaults(): void
    {
        this.calendarFiltersForm.get('type').patchValue('', { emitEvent: false });
        this.calendarFiltersForm.get('attend_type').patchValue('', { emitEvent: false });
        this.calendarFiltersForm.get('child').patchValue('0', { emitEvent: false });
        this.calendarFiltersForm.get('fee').patchValue('0', { emitEvent: false });
        this.calendarFiltersForm.get('room').patchValue('0', { emitEvent: false });
    }

    get isFilterOn(): boolean
    {
        return !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void
    {
        if (e) e.preventDefault();

        this.setFilterFormDefaults();
        
        // reset room filter on week view
        this._masterRollService.setRoomFilter.next(this.formDefaultValues.room);

        // update table
        this._masterRollService.onFilterChanged.next(null);
    }

    updateFilterValues(value: any): void
    {
        for (const key in this.fc)
        {
            if (_.isArray(value))
            {
                for (const item of value)
                {
                    if (key === item)
                    {
                        this.fc[key].patchValue(this.formDefaultValues[key], { emitEvent: false });
                    }
                }
            }
            else
            {
                if (key === value)
                {
                    this.fc[key].patchValue(this.formDefaultValues[key], { emitEvent: false });
                }
            }
        }

        if (CommonHelper.isEqual(this.formDefaultValues, this.getFormValues)) 
        {
            this.clearFilter(null);

            return;
        }

        this._masterRollService.onFilterChanged.next(this.getFormValues);
    }
}

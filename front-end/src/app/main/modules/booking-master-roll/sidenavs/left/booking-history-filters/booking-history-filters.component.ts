import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BookingHistoryService } from '../../../services/booking-history.service';

import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { CommonHelper } from 'app/utils/common.helper';

@Component({
    selector: 'booking-history-filters',
    templateUrl: './booking-history-filters.component.html',
    styleUrls: ['./booking-history-filters.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingHistoryFiltersComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    children: Child[];
    fees: Fee[];
    rooms: Room[];
    showFilterButton: boolean;

    filtersForm: FormGroup;

    formDefaultValues = {
        child: '0',
        fee: '0',
        room: '0'
    };

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {BookingHistoryService} _historyService
     */
    constructor(
        private _logger: NGXLogger,
        private _historyService: BookingHistoryService
    )
    {
        // set default values
        this.children = [];
        this.rooms = [];
        this.fees = [];
        this.showFilterButton = false;

        this.filtersForm = this.createFilterForm();

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
        this._logger.debug('booking history filter !!!');

        // Subscribe to children changes
        this._historyService
            .onChildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Child[]) =>
            {
                this._logger.debug('[on children change]', response);  
                
                this.children = response;
            });

        // Subscribe to fee list changes
        this._historyService
            .onRoomsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Room[]) =>
            {
                this._logger.debug('[on room change]', response);  
                
                this.rooms = response;
            });

        // Subscribe to fee list changes
        this._historyService
            .onFeeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Fee[]) =>
            {
                this._logger.debug('[on fee change]', response);  
                
                this.fees = response;
            });

        // Subscribe to filter form changes
        this.filtersForm
            .get('child')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by child change]', value);

                this._historyService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
            });

        this.filtersForm
            .get('fee')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by fee change]', value);

                this._historyService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
            });

        this.filtersForm
            .get('room')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by room change]', value);

                this._historyService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
            });
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
        return this.filtersForm.controls;
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    get getFormValues(): any
    {
        return {
            child: this.fc.child.value,
            fee: this.fc.fee.value,
            room: this.fc.room.value
        };
    }

    createFilterForm(): FormGroup
    {
        return new FormGroup({
            child: new FormControl('0'), 
            fee: new FormControl('0'),
            room: new FormControl('0')
        });
    }

    setFilterFormDefaults(): void
    {
        this.filtersForm.get('child').patchValue('0', { emitEvent: false });
        this.filtersForm.get('fee').patchValue('0', { emitEvent: false });
        this.filtersForm.get('room').patchValue('0', { emitEvent: false });

        this.showFilterButton = false;
    }

    checkClearFilter(): void
    {
        this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();

        this.setFilterFormDefaults();

        // update table
        this._historyService.onFilterChanged.next(null);
    }
}

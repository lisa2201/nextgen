import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildBookingService } from '../../../services/booking.service';

import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { Child } from 'app/main/modules/child/child.model';

import { CommonHelper } from 'app/utils/common.helper';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'child-calender-filters',
    templateUrl: './calender-filters.component.html',
    styleUrls: ['./calender-filters.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildCalenderFiltersComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    fees: Fee[];
    showFilterButton: boolean;

    calendarFiltersForm: FormGroup;

    formDefaultValues = {
        type: '',
        attend_type: '',
        fee: '0',
        room: '0'
    };

    bookingTypes: any;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildBookingService} _bookingService
     */
    constructor(
        private _logger: NGXLogger,
        private _bookingService: ChildBookingService
    )
    {
        // set default values
        this.fees = [];
        this.showFilterButton = false;
        this.bookingTypes = AppConst.bookingTypes;
        
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
        this._logger.debug('child calender filter!!!');
        
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

                this._bookingService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
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

                this._bookingService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
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

                this._bookingService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
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

                this._bookingService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
            });

        // Subscribe to child changes
        this._bookingService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[on child change]', response);  
                
                this.child = response;
            });

        // Subscribe to fee list changes
        this._bookingService
            .onFilterFeeChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[on fee change]', response);  
                
                this.fees = response;
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
        return this.calendarFiltersForm.controls;
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    get getFormValues(): any
    {
        return {
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
            fee: new FormControl('0'),
            room: new FormControl('0')
        });
    }

    setFilterFormDefaults(): void
    {
        this.calendarFiltersForm.get('type').patchValue('', { emitEvent: false });
        this.calendarFiltersForm.get('attend_type').patchValue('', { emitEvent: false });
        this.calendarFiltersForm.get('fee').patchValue('0', { emitEvent: false });
        this.calendarFiltersForm.get('room').patchValue('0', { emitEvent: false });

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
        this._bookingService.onFilterChanged.next(null);
    }
}


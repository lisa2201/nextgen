import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { FinancialAdjustmentsService } from '../../../services/financial-adjustments.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { CommonHelper } from 'app/utils/common.helper';

@Component({
    selector: 'app-financial-adjustments-left-sidenav',
    templateUrl: './financial-adjustments-left-sidenav.component.html',
    styleUrls: ['./financial-adjustments-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancialAdjustmentsLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;

    financialAdjustmentsFilterForm: FormGroup;

    adjustmentItems: [];

    formDefaultValues = {
        date: null,
        type: '0',
        item: null
    };


    constructor(
        private _financialAdjustmentsService: FinancialAdjustmentsService,
        private _logger: NGXLogger
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.financialAdjustmentsFilterForm = this.createFilterForm();

        this.setFilterFormDefaults();

        this.adjustmentItems = [];

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('financial adjustments left side nav!!!');

        // Subscribe to filter changes
        this.financialAdjustmentsFilterForm
            .get('date')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                this._logger.debug('[filter by date change]', value);

                if (!_.isNull(value)) {
                    this._financialAdjustmentsService.onFilterChanged.next({
                        date: DateTimeHelper.getUtcDate(this.fc.date.value),
                        type: this.fc.type.value,
                        item: this.fc.item.value
                    });
                }

                this.checkClearFilter();
            });

        this.financialAdjustmentsFilterForm
            .get('type')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                this._logger.debug('[filter by type change]', value);

                if (!_.isNull(value)) {
                    this._financialAdjustmentsService.onFilterChanged.next({
                        date: DateTimeHelper.getUtcDate(this.fc.date.value),
                        type: this.fc.type.value,
                        item: this.fc.item.value
                    });
                }

                this.checkClearFilter();
            });

        this.financialAdjustmentsFilterForm
            .get('item')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                this._logger.debug('[filter by item change]', value);

                if (!_.isNull(value)) {
                    this._financialAdjustmentsService.onFilterChanged.next({
                        date: DateTimeHelper.getUtcDate(this.fc.date.value),
                        type: this.fc.type.value,
                        item: this.fc.item.value
                    });
                }

                this.checkClearFilter();
            });

        // Subscribe to invitation list changes
        this._financialAdjustmentsService
            .onFinancialAdjustmentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this.financialAdjustmentsFilterForm[(response.total < 1) ? 'disable' : 'enable']({ emitEvent: false });

                // reset filter
                if (response.total < 1) {
                    this.setFilterFormDefaults();
                }
            });


        this._financialAdjustmentsService.adjustmentItemChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((items) => {
                this.adjustmentItems = items;
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    get fc(): any {
        return this.financialAdjustmentsFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            date: this.fc.date.value,
            type: this.fc.type.value,
            item: this.fc.item.value
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            date: new FormControl(null),
            type: new FormControl(''),
            item: new FormControl(null)
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.financialAdjustmentsFilterForm.get('date').patchValue(null, { emitEvent: false });
        this.financialAdjustmentsFilterForm.get('type').patchValue('0', { emitEvent: false });
        this.financialAdjustmentsFilterForm.get('item').patchValue(null, { emitEvent: false });
        this.showFilterButton = false;
    }

    /**
     * Set reset filter
     */
    checkClearFilter(): void {
        this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
    }

    /**
     * Clear filter
     * @param {MouseEvent} e 
     */
    clearFilter(e: MouseEvent): void {
        e.preventDefault();

        this.setFilterFormDefaults();

        // update table
        this._financialAdjustmentsService.onFilterChanged.next(null);
    }

}

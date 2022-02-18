import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { BalanceAdjustmentsService } from '../../../services/balance-adjustments.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { CommonHelper } from 'app/utils/common.helper';

@Component({
    selector: 'app-balance-adjustments-left-sidenav',
    templateUrl: './balance-adjustments-left-sidenav.component.html',
    styleUrls: ['./balance-adjustments-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BalanceAdjustmentsLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    balanceAdjustmentsFilterForm: FormGroup;

    formDefaultValues = {
        date: null,
        type: '0'
    };

    /**
     * constructor
     * @param {BalanceAdjustmentsService} _balanceAdjustmentsService 
     * @param {NGXLogger} _logger 
     */
    constructor(
        private _balanceAdjustmentsService: BalanceAdjustmentsService,
        private _logger: NGXLogger
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.balanceAdjustmentsFilterForm = this.createFilterForm();

        this.setFilterFormDefaults();

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

        this._logger.debug('balance adjustments left side nav!!!');

        // Subscribe to filter changes
        this.balanceAdjustmentsFilterForm
            .get('date')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                this._logger.debug('[filter by date change]', value);

                if (!_.isNull(value)) {
                    this._balanceAdjustmentsService.onFilterChanged.next({
                        date: DateTimeHelper.getUtcDate(this.fc.date.value),
                        type: this.fc.type.value
                    });
                }

                this.checkClearFilter();
            });

        this.balanceAdjustmentsFilterForm
            .get('type')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                this._logger.debug('[filter by type change]', value);

                if (!_.isNull(value)) {
                    this._balanceAdjustmentsService.onFilterChanged.next({
                        date: DateTimeHelper.getUtcDate(this.fc.date.value),
                        type: this.fc.type.value
                    });
                }

                this.checkClearFilter();
            });

        // Subscribe to filter list changes
        this._balanceAdjustmentsService
            .onBalanceAdjustmentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this.balanceAdjustmentsFilterForm[(response.total < 1) ? 'disable' : 'enable']({ emitEvent: false });

                // reset filter
                if (response.total < 1) {
                    this.setFilterFormDefaults();
                }
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
        return this.balanceAdjustmentsFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            date: this.fc.date.value,
            type: this.fc.type.value
        };
    }



    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            date: new FormControl(null),
            type: new FormControl('')
        });
    }



    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.balanceAdjustmentsFilterForm.get('date').patchValue(null, { emitEvent: false });
        this.balanceAdjustmentsFilterForm.get('type').patchValue('0', { emitEvent: false });
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
        this._balanceAdjustmentsService.onFilterChanged.next(null);
    }

}


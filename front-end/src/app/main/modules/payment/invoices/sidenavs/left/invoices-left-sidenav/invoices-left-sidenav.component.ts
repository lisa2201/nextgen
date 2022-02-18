import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { NGXLogger } from 'ngx-logger';
import { takeUntil, combineAll, mergeAll } from 'rxjs/operators';
import { Subject, combineLatest, forkJoin, merge } from 'rxjs';
import * as _ from 'lodash';

import { CommonHelper } from 'app/utils/common.helper';
import { InvoicesService } from '../../../services/invoices.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-invoices-left-sidenav',
    templateUrl: './invoices-left-sidenav.component.html',
    styleUrls: ['./invoices-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InvoicesLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;

    invoiceFiltersForm: FormGroup;

    formDefaultValues = {
        status: '0',
        start_date: null,
        end_date: null,
        due_date: null
    };

    /**
     * Constructor
     * @param {InvoicesService} _invoiceService 
     * @param {NGXLogger} _logger 
     */
    constructor(
        private _invoiceService: InvoicesService,
        private _logger: NGXLogger
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.invoiceFiltersForm = this.createFilterForm();

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

        this._logger.debug('invoice left side nav!!!');

        // Subscribe to filter changes
        this.invoiceFiltersForm
            .get('status')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                this._logger.debug('[filter by status change]', value);

                if (!_.isNull(value)) {
                    this.triggerFilter();
                }

                this.checkClearFilter();
            });

        this.invoiceFiltersForm
            .get('start_date')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {

                this._logger.debug('[filter by start date change]', value);

                const endDate = this.invoiceFiltersForm.get('end_date');

                if (!value) {
                    endDate.patchValue(null, {emitEvent: false});
                    endDate.disable();
                } else {
                    endDate.enable();
                }

            });

        this.invoiceFiltersForm
            .get('end_date')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {

                this._logger.debug('[filter by end date change]', value);

                if (!_.isNull(value) && this.invoiceFiltersForm.get('start_date').value) {
                    this.triggerFilter();
                }

                this.checkClearFilter();

            });

        this.invoiceFiltersForm
            .get('due_date')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {

                this._logger.debug('[filter by due date change]', value);

                if (!_.isNull(value)) {
                    this.triggerFilter();
                }

                this.checkClearFilter();

            });
            

        // Subscribe to invitation list changes
        this._invoiceService
            .onInvoiceChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this.invoiceFiltersForm[(response.total < 1) ? 'disable' : 'enable']({ emitEvent: false });

                // reset filter
                if (response.total < 1) {
                    this.setFilterFormDefaults();
                }
            });
        
        this.invoiceFiltersForm.get('end_date').disable();
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
        return this.invoiceFiltersForm.controls;
    }

    get getFormValues(): any {
        return {
            status: this.fc.status.value,
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            due_date: DateTimeHelper.getUtcDate(this.fc.due_date.value)
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            status: new FormControl('0'),
            start_date: new FormControl(null),
            end_date: new FormControl(null),
            due_date: new FormControl(null)
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.invoiceFiltersForm.get('status').patchValue('0', { emitEvent: false });
        this.invoiceFiltersForm.get('start_date').patchValue(null, { emitEvent: false });
        this.invoiceFiltersForm.get('end_date').patchValue(null, { emitEvent: false });
        this.invoiceFiltersForm.get('due_date').patchValue(null, { emitEvent: false });
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
        this._invoiceService.onFilterChanged.next(null);
    }

    triggerFilter(): void {

        this._invoiceService.onFilterChanged.next(this.getFormValues);

    }

}

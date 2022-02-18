import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { PaymentHistoriesService } from '../../../services/payment-histories.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import { CommonHelper } from 'app/utils/common.helper';
import * as _ from 'lodash';
import * as moment from 'moment';

@Component({
    selector: 'app-payment-histories-left-sidenav',
    templateUrl: './payment-histories-left-sidenav.component.html',
    styleUrls: ['./payment-histories-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PaymentHistoriesLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;

    paymentHistoriesFilterForm: FormGroup;

    formDefaultValues = {
        status: '0',
        date: null
    };

    /**
     * Constructor
     * @param {PaymentHistoriesService} _paymentHistoriesService
     * @param {NGXLogger} _logger 
     */
    constructor(
        private _paymentHistoriesService: PaymentHistoriesService,
        private _logger: NGXLogger
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.paymentHistoriesFilterForm = this.createFilterForm();

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

        this._logger.debug('payment history left side nav!!!');

        // Subscribe to filter changes
        this.paymentHistoriesFilterForm
            .get('status')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                this._logger.debug('[filter by status change]', value);

                if (!_.isNull(value)) {
                    this._paymentHistoriesService.onFilterChanged.next({
                        status: this.fc.status.value
                    });
                }

                this.checkClearFilter();
            });

        this.paymentHistoriesFilterForm
            .get('date')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                this._logger.debug('[filter by date change]', value);

                if (!_.isNull(value)) {
                    this._paymentHistoriesService.onFilterChanged.next({
                        date: moment(this.fc.date.value).format('YYYY-MM-DD')
                    });
                }

                this.checkClearFilter();
            });

        // Subscribe to invitation list changes
        this._paymentHistoriesService
            .onPaymentHistoryChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this.paymentHistoriesFilterForm[(response.total < 1) ? 'disable' : 'enable']({ emitEvent: false });

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
        return this.paymentHistoriesFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            status: this.fc.status.value,
            date: this.fc.date.value
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            status: new FormControl(null),
            date: new FormControl(null)
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.paymentHistoriesFilterForm.get('status').patchValue('0', { emitEvent: false });
        this.paymentHistoriesFilterForm.get('date').patchValue(null, { emitEvent: false });
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
        this._paymentHistoriesService.onFilterChanged.next(null);
    }

    changeDate(ev: any): void {
        
    }

}

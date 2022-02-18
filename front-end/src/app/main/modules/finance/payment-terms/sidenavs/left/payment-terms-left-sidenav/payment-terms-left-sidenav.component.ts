import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { CommonHelper } from 'app/utils/common.helper';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaymentTermsService } from '../../../services/payment-terms.service';

@Component({
    selector: 'app-payment-terms-left-sidenav',
    templateUrl: './payment-terms-left-sidenav.component.html',
    styleUrls: ['./payment-terms-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PaymentTermsLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    paymentTermFilterForm: FormGroup;
    loading: boolean;

    formDefaultValues: any;

    constructor(
        private _paymentTermsService: PaymentTermsService,
        private _logger: NGXLogger
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.loading = false;
        this.paymentTermFilterForm = this.createFilterForm();

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

        this._paymentTermsService
            .onDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((defaultValues: any) => {
                this.formDefaultValues = defaultValues;
            });

        this._paymentTermsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.loading = value;
            });

        this.dateChangeHandler();

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
        return this.paymentTermFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            transaction_generation_date: DateTimeHelper.getUtcDate(this.fc.transaction_date.value),
            payment_generation_date: DateTimeHelper.getUtcDate(this.fc.payment_date.value),
            status: this.fc.status.value
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            status: new FormControl('all'),
            start_date: new FormControl(null),
            end_date: new FormControl(null),
            transaction_date: new FormControl(null),
            payment_date: new FormControl(null)
        });
    }


    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.paymentTermFilterForm.get('status').patchValue('all', { emitEvent: false });
        this.paymentTermFilterForm.get('start_date').patchValue(null, { emitEvent: false });
        this.paymentTermFilterForm.get('end_date').patchValue(null, { emitEvent: false });
        this.paymentTermFilterForm.get('transaction_date').patchValue(null, { emitEvent: false });
        this.paymentTermFilterForm.get('payment_date').patchValue(null, { emitEvent: false });
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
        this.filter(null);
    }

    dateChangeHandler(): void {

        const startDate = this.paymentTermFilterForm.get('start_date');
        const endDate = this.paymentTermFilterForm.get('end_date');

        startDate.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value) => {

                endDate.reset();

                if (value) {
                    endDate.setValidators([Validators.required]);
                } else {
                    endDate.clearValidators();
                }

                endDate.updateValueAndValidity();

            });


    }

    disabledDate = (current: Date): boolean => {
        // Can not select days before start date

        const startDate = this.paymentTermFilterForm.get('start_date').value;

        if (startDate) {
            return DateTimeHelper.parseMoment(current).isSameOrBefore(DateTimeHelper.parseMoment(startDate));
        } else {
            return false;
        }

    }

    filter(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        const values = this.getFormValues;

        this._paymentTermsService.onFilterChanged.next(values);

        this.checkClearFilter();

    }

}

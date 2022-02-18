import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { FinanceAccountsService } from '../../../services/finance-accounts.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { CommonHelper } from 'app/utils/common.helper';
import { BillingTerm } from 'app/main/modules/finance/shared/model/finance.model';
import * as moment from 'moment';
import { FinanceService } from 'app/main/modules/finance/shared/services/finance.service';

@Component({
    selector: 'app-finance-accounts-left-sidenav',
    templateUrl: './finance-accounts-left-sidenav.component.html',
    styleUrls: ['./finance-accounts-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountsLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    loading: boolean;
    financeAccountsFilterForm: FormGroup;
    paymentFrequencies: { name: string, value: string }[];
    billingTerms: BillingTerm[];
    billingTermsList: BillingTerm[];
    billingTermDescriptionMap: any;
    paymentdays: { name: string, value: string }[];

    formDefaultValues: any;

    constructor(
        private _financeAccountsService: FinanceAccountsService,
        private _financeService: FinanceService,
        private _logger: NGXLogger
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.financeAccountsFilterForm = this.createFilterForm();

        this.setFilterFormDefaults();
        this.setSelectValues();

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

        this._logger.debug('finance accounts left side nav!!!');

        this.setChangeHandlers();


        // Subscribe to filter list changes
        this._financeAccountsService.onDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((defaultValues: any) => {
                this.formDefaultValues = defaultValues;
            });

        this._financeAccountsService.onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.loading = value;
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
        return this.financeAccountsFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            payment_schedule: this.fc.payment_schedule.value,
            payment_method: this.fc.payment_method.value,
            account_balance_equality: this.fc.account_balance_equality.value,
            account_balance_value: this.fc.account_balance_value.value,
            last_payment_date_equality: this.fc.last_payment_date_equality.value,
            last_payment_date: this.fc.last_payment_date.value,
            next_payment_date_equality: this.fc.next_payment_date_equality.value,
            next_payment_date: this.fc.next_payment_date.value,
            primary_payer: this.fc.primary_payer.value,
            parent_status: this.fc.parent_status.value,
            payment_frequency: this.fc.payment_frequency.value,
            billing_term: this.fc.billing_term.value,
            payment_day: this.fc.payment_day.value,
            auto_charge: this.fc.auto_charge.value
        };
    }

    setSelectValues(): void {

        this.paymentFrequencies = this._financeService.getPaymentFrequencies();

        const weekdays = moment.weekdays();

        _.remove(weekdays, (day: string) => _.indexOf(['sunday', 'saturday'], _.lowerCase(day)) > -1);

        this.paymentdays = _.map(weekdays, (day) => ({ name: day, value: _.lowerCase(day) }));

        this.billingTermsList = this._financeService.getBillingTermList();

        this.billingTermDescriptionMap = this._financeService.getBillingTermDescriptionMap();

    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            payment_schedule: new FormControl('all'),
            payment_method: new FormControl('all'),
            account_balance_equality: new FormControl(null),
            account_balance_value: new FormControl(null),
            last_payment_date_equality: new FormControl(null),
            last_payment_date: new FormControl(null),
            next_payment_date_equality: new FormControl(null),
            next_payment_date: new FormControl(null),
            primary_payer: new FormControl('yes'),
            parent_status: new FormControl('0'),
            payment_frequency: new FormControl(null),
            billing_term: new FormControl(null),
            payment_day: new FormControl(null),
            auto_charge: new FormControl(true)
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.financeAccountsFilterForm.get('payment_schedule').patchValue('all', { emitEvent: true });
        this.financeAccountsFilterForm.get('payment_method').patchValue('all', { emitEvent: false });
        this.financeAccountsFilterForm.get('account_balance_equality').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('account_balance_value').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('last_payment_date_equality').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('last_payment_date').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('next_payment_date_equality').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('next_payment_date').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('primary_payer').patchValue('yes', { emitEvent: false });
        this.financeAccountsFilterForm.get('parent_status').patchValue('0', { emitEvent: false });
        this.financeAccountsFilterForm.get('payment_frequency').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('billing_term').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('payment_day').patchValue(null, { emitEvent: false });
        this.financeAccountsFilterForm.get('auto_charge').patchValue(true, { emitEvent: false });
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
        // this.getFormValues
        this._financeAccountsService.onFilterChanged.next(this.getFormValues);
    }

    setChangeHandlers(): void {

        const accountEquality = this.financeAccountsFilterForm.get('account_balance_equality');
        const accountBalance = this.financeAccountsFilterForm.get('account_balance_value');
        const paymentEquality = this.financeAccountsFilterForm.get('last_payment_date_equality');
        const lastPaymentDate = this.financeAccountsFilterForm.get('last_payment_date');
        const nextPaymentEquality = this.financeAccountsFilterForm.get('next_payment_date_equality');
        const nextPaymentDate = this.financeAccountsFilterForm.get('next_payment_date');
        const paymentFrequency = this.financeAccountsFilterForm.get('payment_frequency');
        const billingTerm = this.financeAccountsFilterForm.get('billing_term');

        setTimeout(() => {
            accountBalance.disable();
            lastPaymentDate.disable();
            nextPaymentDate.disable();
        }, 100);

        accountEquality
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {

                if (value) {
                    accountBalance.enable();
                } else {
                    accountBalance.disable();
                }

            });

        paymentEquality
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {

                if (value) {
                    lastPaymentDate.enable();
                } else {
                    lastPaymentDate.disable();
                }

            });

        nextPaymentEquality
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {

                if (value) {
                    nextPaymentDate.enable();
                } else {
                    nextPaymentDate.disable();
                }

            });

        paymentFrequency
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {

                if (!value) {
                    return;
                }

                if (value === 'monthly') {

                    this.billingTerms = _.filter(this.billingTermsList, (val: BillingTerm) => {
                        return (val.frequency === 'all' || val.frequency === 'monthly');
                    });

                } else if (value === 'weekly') {

                    this.billingTerms = _.filter(this.billingTermsList, (val: BillingTerm) => {
                        return (val.frequency === 'all' || val.frequency === 'weekly');
                    });

                } else if ('fortnightly') {

                    this.billingTerms = _.filter(this.billingTermsList, (val: BillingTerm) => {
                        return (val.frequency === 'all' || val.frequency === 'fortnightly');
                    });

                }

                billingTerm.patchValue(null, {emitEvent: false});

            });
    }

    filter(event: MouseEvent): void {

        event.preventDefault();

        this._financeAccountsService.onFilterChanged.next(this.getFormValues);

        this.checkClearFilter();

    }

    planInputDisable(): boolean {
        return this.financeAccountsFilterForm.controls['payment_schedule'].value === 'all' || this.financeAccountsFilterForm.controls['payment_schedule'].value === 'no';
    }
}

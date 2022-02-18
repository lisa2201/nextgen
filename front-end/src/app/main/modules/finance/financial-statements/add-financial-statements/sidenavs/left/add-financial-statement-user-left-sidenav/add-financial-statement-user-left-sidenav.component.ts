import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { BillingTerm } from 'app/main/modules/finance/shared/model/finance.model';
import { FinanceService } from 'app/main/modules/finance/shared/services/finance.service';
import { CommonHelper } from 'app/utils/common.helper';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FinancialStatementsService } from '../../../../services/financial-statements.service';
import * as moment from 'moment';
import * as _ from 'lodash';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

@Component({
    selector: 'app-add-financial-statement-user-left-sidenav',
    templateUrl: './add-financial-statement-user-left-sidenav.component.html',
    styleUrls: ['./add-financial-statement-user-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AddFinancialStatementUserLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    statementUserFilterForm: FormGroup;
    loading: boolean;
    paymentFrequencies: { name: string, value: string }[];
    billingTerms: BillingTerm[];
    billingTermsList: BillingTerm[];
    billingTermDescriptionMap: any;
    paymentdays: { name: string, value: string }[];
    formDefaultValues: any;

    constructor(
        private _financialStatementsService: FinancialStatementsService,
        private _logger: NGXLogger,
        private _financeService: FinanceService,
        private _fuseSidebarService: FuseSidebarService
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.loading = false;
        this.statementUserFilterForm = this.createFilterForm();

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

        this._logger.debug('financial statements user filter left side nav!!!');

        this._financialStatementsService.onUserDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((defaultValues: any) => {
                this.formDefaultValues = defaultValues;
            });

        this._financialStatementsService.onUserFilterLoading
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: boolean) => {
                this.loading = value;

                if (!value) {
                    const sidebar = this._fuseSidebarService.getSidebar('financial-statements-user-filter-sidebar');

                    if (sidebar.opened) {
                        sidebar.toggleOpen();
                    }
                }
            });

        this.statementUserFilterForm.get('payment_frequency')
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

                this.statementUserFilterForm.get('billing_term').patchValue(null, {emitEvent: false});

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
        return this.statementUserFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            payment_schedule: this.fc.payment_schedule.value,
            primary_payer: this.fc.primary_payer.value,
            payment_frequency: this.fc.payment_frequency.value,
            parent_status: this.fc.parent_status.value,
            billing_term: this.fc.billing_term.value,
            payment_day: this.fc.payment_day.value,
            auto_charge: this.fc.auto_charge.value,
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            payment_schedule: new FormControl('all'),
            primary_payer: new FormControl(true),
            parent_status: new FormControl('0'),
            payment_frequency: new FormControl(null),
            billing_term: new FormControl(null),
            payment_day: new FormControl(null),
            auto_charge: new FormControl(true)
        });
    }

    setSelectValues(): void {

        this.paymentFrequencies = [
            {
                name: 'Weekly',
                value: 'weekly'
            },
            {
                name: 'Fortnightly',
                value: 'fortnightly'
            },
            {
                name: 'Monthly - every 4 weeks',
                value: 'monthly'
            }
        ];

        const weekdays = moment.weekdays();

        _.remove(weekdays, (day: string) => _.indexOf(['sunday', 'saturday'], _.lowerCase(day)) > -1);

        this.paymentdays = _.map(weekdays, (day) => ({ name: day, value: _.lowerCase(day) }));

        this.billingTermsList = this._financeService.getBillingTermList();

        this.billingTermDescriptionMap = this._financeService.getBillingTermDescriptionMap();

    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.statementUserFilterForm.get('payment_schedule').patchValue('all', { emitEvent: false });
        this.statementUserFilterForm.get('primary_payer').patchValue(true, { emitEvent: false });
        this.statementUserFilterForm.get('parent_status').patchValue('0', { emitEvent: false });
        this.statementUserFilterForm.get('payment_frequency').patchValue(null, { emitEvent: false });
        this.statementUserFilterForm.get('billing_term').patchValue(null, { emitEvent: false });
        this.statementUserFilterForm.get('payment_day').patchValue(null, { emitEvent: false });
        this.statementUserFilterForm.get('auto_charge').patchValue(true, { emitEvent: false });
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

    filter(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        const values = this.getFormValues;

        this._financialStatementsService.onUserFilterChanged.next(values);

        this.checkClearFilter();

    }

    planInputDisable(): boolean {
        return this.statementUserFilterForm.controls['payment_schedule'].value === 'all' || this.statementUserFilterForm.controls['payment_schedule'].value === 'no';
    }

}

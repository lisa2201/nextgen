import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { FinanceAccountPaymentsService } from '../../../services/finance-account-payments.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { CommonHelper } from 'app/utils/common.helper';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { FinanceService } from 'app/main/modules/finance/shared/services/finance.service';
import { User } from 'app/main/modules/user/user.model';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-finance-account-payments-left-sidenav',
    templateUrl: './finance-account-payments-left-sidenav.component.html',
    styleUrls: ['./finance-account-payments-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountPaymentsLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    financeAccountPaymentsFilterForm: FormGroup;
    statusArray: string[];
    parents: User[];
    loading: boolean;

    formDefaultValues: any;

    constructor(
        private _financeAccountPaymentsService: FinanceAccountPaymentsService,
        private _financeService: FinanceService,
        private _logger: NGXLogger,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.loading = false;
        this.financeAccountPaymentsFilterForm = this.createFilterForm();

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

        this.setStatusArray();

        this._financeAccountPaymentsService.onDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((defaultValues: any) => {
                this.formDefaultValues = defaultValues;
            });

        this._financeAccountPaymentsService
            .onFilterParentChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((parents: User[]) => {
                this.parents = parents;
            });

        this._financeAccountPaymentsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.loading = value;
            });

        // Filter by single person
        setTimeout(() => this.filterByPerson(), 200);

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
        return this.financeAccountPaymentsFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            status: this.fc.status.value,
            type: this.fc.type.value,
            date: this.fc.date.value,
            parent: this.fc.parent.value,
            payment_method: this.fc.payment_method.value,
            parent_status: this.fc.parent_status.value,
            payment_process: this.fc.payment_process.value,
            payment_generation: this.fc.payment_generation.value
        };
    }

    setStatusArray(): void {

        this.statusArray = [
            'approved',
            'pending',
            'submitted',
            'completed',
            'inactive',
            'rejected_gateway',
            'rejected_user',
            'refund_success',
            'refund_failed'
        ];

    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            status: new FormControl('all'),
            type: new FormControl('all'),
            date: new FormControl(null),
            parent: new FormControl(null),
            payment_method: new FormControl('all'),
            parent_status: new FormControl('0'),
            payment_generation: new FormControl('all'),
            payment_process: new FormControl('all')
        });
    }

    /**
     * Clear Query Params
     */
    clearQueryParams(): void {
        this._router.navigate(['.'], { relativeTo: this._route, queryParams: null });
    }


    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.financeAccountPaymentsFilterForm.get('status').patchValue('all', { emitEvent: false });
        this.financeAccountPaymentsFilterForm.get('type').patchValue('all', { emitEvent: false });
        this.financeAccountPaymentsFilterForm.get('date').patchValue(null, { emitEvent: false });
        this.financeAccountPaymentsFilterForm.get('parent').patchValue(null, { emitEvent: false });
        this.financeAccountPaymentsFilterForm.get('payment_method').patchValue('all', { emitEvent: false });
        this.financeAccountPaymentsFilterForm.get('parent_status').patchValue('0', { emitEvent: false });
        this.financeAccountPaymentsFilterForm.get('payment_process').patchValue('all', { emitEvent: false });
        this.financeAccountPaymentsFilterForm.get('payment_generation').patchValue('all', { emitEvent: false });
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

    getStatusDescription(status: string): string {

        return this._financeService.getParentPaymentStatusDescription(status);

    }

    filter(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        const values = this.getFormValues;

        this._financeAccountPaymentsService.onFilterChanged.next(values);

        if (!values.parent) {
            this.clearQueryParams();
        }

        this.checkClearFilter();

    }

    /**
     * Filter by Person
     */
    filterByPerson(): void {

        if (this._route.snapshot.queryParamMap.get('parent')) {

            const queryparam = this._route.snapshot.queryParamMap.get('parent');

            this._logger.debug('[filter by parent]', queryparam);

            this.financeAccountPaymentsFilterForm.get('parent').patchValue(queryparam, { emitEvent: true });

            this.filter(null);

        }


    }

}

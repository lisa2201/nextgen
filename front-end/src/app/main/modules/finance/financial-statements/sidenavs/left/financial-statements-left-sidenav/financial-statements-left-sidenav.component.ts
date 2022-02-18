import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { FinancialStatementsService } from '../../../services/financial-statements.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { CommonHelper } from 'app/utils/common.helper';
import * as _ from 'lodash';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'app/main/modules/user/user.model';

@Component({
    selector: 'app-financial-statements-left-sidenav',
    templateUrl: './financial-statements-left-sidenav.component.html',
    styleUrls: ['./financial-statements-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancialStatementsLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;

    financialStatementsFilterForm: FormGroup;
    parents: User[];
    loading: boolean;

    formDefaultValues: any;


    constructor(
        private _financialStatementsService: FinancialStatementsService,
        private _logger: NGXLogger,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.loading = false;
        this.financialStatementsFilterForm = this.createFilterForm();

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

        this._logger.debug('financial statements left side nav!!!');

        this._financialStatementsService.onDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((defaultValues: any) => {
                this.formDefaultValues = defaultValues;
            });

        this._financialStatementsService
            .onFilterParentChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((parents: User[]) => {
                this.parents = parents;
            });

        this._financialStatementsService.onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.loading = value;
            });

        // Filter by single perso
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
        return this.financialStatementsFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            start_date: this.fc.start_date.value,
            end_date: this.fc.end_date.value,
            invoice_date: this.fc.invoice_date.value,
            type: this.fc.type.value,
            parent: this.fc.parent.value,
            parent_status: this.fc.parent_status.value
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            start_date: new FormControl(null),
            end_date: new FormControl(null),
            invoice_date: new FormControl(null),
            type: new FormControl('0'),
            parent: new FormControl(null),
            parent_status: new FormControl('0')
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.financialStatementsFilterForm.get('start_date').patchValue(null, { emitEvent: false });
        this.financialStatementsFilterForm.get('end_date').patchValue(null, { emitEvent: false });
        this.financialStatementsFilterForm.get('invoice_date').patchValue(null, { emitEvent: false });
        this.financialStatementsFilterForm.get('type').patchValue('0', { emitEvent: false });
        this.financialStatementsFilterForm.get('parent').patchValue(null, { emitEvent: false });
        this.financialStatementsFilterForm.get('parent_status').patchValue('0', { emitEvent: false });
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

    /**
     * Filter by Person
     */
    filterByPerson(): void {

        if (this._route.snapshot.queryParamMap.get('parent')) {

            const queryparam = this._route.snapshot.queryParamMap.get('parent');

            this._logger.debug('[filter by parent]', queryparam);

            this.financialStatementsFilterForm.get('parent').patchValue(queryparam, { emitEvent: false });

            this.filter(null);

        }


    }
    

    /**
     * Clear Query Params
     */
    clearQueryParams(): void {
        this._router.navigate(['.'], { relativeTo: this._route, queryParams: null });
    }

    filter(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        const values = this.getFormValues;

        this._financialStatementsService.onFilterChanged.next(values);

        if (!values.parent) {
            this.clearQueryParams();
        }

        this.checkClearFilter();

    }

}

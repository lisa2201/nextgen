import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { CommonHelper } from 'app/utils/common.helper';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ParentPaymentProvidersService } from '../../../services/parent-payment-providers.service';

@Component({
    selector: 'app-parent-payment-providers-left-sidenav',
    templateUrl: './parent-payment-providers-left-sidenav.component.html',
    styleUrls: ['./parent-payment-providers-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentPaymentProvidersLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    paymentProviderFilterForm: FormGroup;
    loading: boolean;

    formDefaultValues: any;

    constructor(
        private _parentPaymentProvidersService: ParentPaymentProvidersService,
        private _logger: NGXLogger
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.loading = false;
        this.paymentProviderFilterForm = this.createFilterForm();

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

        this._parentPaymentProvidersService
            .onDefaultFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((defaultValues: any) => {
                this.formDefaultValues = defaultValues;
            });

        this._parentPaymentProvidersService
            .onTableLoaderChanged
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
        return this.paymentProviderFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            status: this.fc.status.value
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            status: new FormControl('all')
        });
    }


    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.paymentProviderFilterForm.get('status').patchValue('all', { emitEvent: false });
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

        this._parentPaymentProvidersService.onFilterChanged.next(values);

        this.checkClearFilter();

    }

}

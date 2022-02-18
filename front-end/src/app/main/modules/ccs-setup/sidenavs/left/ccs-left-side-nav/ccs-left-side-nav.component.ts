import { Component, OnInit, OnDestroy, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { Branch } from 'app/main/modules/branch/branch.model';
import { InvitationService } from 'app/main/modules/invitation/services/invitation.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import { CommonHelper } from 'app/utils/common.helper';
import * as _ from 'lodash';
import { EventEmitter } from 'events';
import { CcsSetupService } from '../../../ccs-setup.service';
import { CcsSetup } from '../../../ccs-setup.model';

@Component({
    selector: 'ccs-left-side-nav',
    templateUrl: './ccs-left-side-nav.component.html',
    styleUrls: ['./ccs-left-side-nav.component.scss']
})
export class CcsLeftSideNavComponent implements OnInit, OnDestroy {
    // Private
    private _unsubscribeAll: Subject<any>;
    branches: Branch[];
    showFilterButton: boolean;
    isFilterChange: boolean;

    ccsFiltersForm: FormGroup;

    formDefaultValues = {
        status: '0'
    };
    isLoadingData: boolean;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {InvitationService} _invitationService
     */
    constructor(
        private _logger: NGXLogger, // private _invitationService: InvitationService
        private _ccsSetupService: CcsSetupService
    ) {
        // Set defaults
        this.branches = [];
        this.showFilterButton = false;
        this.isFilterChange = false;
        // this.filterBy.status = "2";
        this.ccsFiltersForm = this.createFilterForm();

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
        this._logger.debug('ccs left side nav!!!');
        this.ccsFiltersForm
            .get('status')
            .valueChanges.pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[filter by status change]', value);

                if (!_.isNull(value)) {
                    this._ccsSetupService.onFilterChanged.next({
                        status: this.fc.status.value
                    });
                }

                this.checkClearFilter();
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get fc(): any {
        return this.ccsFiltersForm.controls;
    }

    get getFormValues(): any {
        return {
            status: this.fc.status.value
        };
    }
    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * convenience getter for easy access to form fields
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            status: new FormControl(this.formDefaultValues.status)
        });
    }

    setFilterFormDefaults(): void {
        this.ccsFiltersForm.get('status').patchValue('0', { emitEvent: false });
        this.showFilterButton = false;
    }

    checkClearFilter(): void {
        this.showFilterButton = !CommonHelper.isEqual(
            this.formDefaultValues,
            this.getFormValues
        );
    }

    clearFilter(e: MouseEvent): void {
        e.preventDefault();
        this.setFilterFormDefaults();
        // update table
        // this._invitationService.onFilterChanged.next(this.getFormValues);
    }
}

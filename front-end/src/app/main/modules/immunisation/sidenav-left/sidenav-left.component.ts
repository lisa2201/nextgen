import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { CommonHelper } from 'app/utils/common.helper';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Branch } from '../../branch/branch.model';
import { ImmunisationService } from '../service/immunisation.service';

@Component({
  selector: 'immunisation-sidenav-left',
  templateUrl: './sidenav-left.component.html',
  styleUrls: ['./sidenav-left.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationSidenavLeftComponent implements OnInit, OnDestroy{

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    branches: Branch[];
    immunisationFiltersForm: FormGroup;

    formDefaultValues = {
        status: '0',
        branch: null
    };
    constructor(
        private _logger: NGXLogger,
        private _immunisationService: ImmunisationService,
    ) 
    {
        this.showFilterButton = false;
        this.immunisationFiltersForm = this.createFilterForm();
        this.setFilterFormDefaults();
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.branches = [];
    }

  ngOnInit() {

    this._logger.debug('immunisation left side nav!!!');

    // Subscribe to filter changes
    this.immunisationFiltersForm
        .get('status')
        .valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll)
        )
        .subscribe(value =>
        {
            this._logger.debug('[filter by status change]', value);

            if (!_.isNull(value))
            {
                this._immunisationService.onFilterChanged.next({
                    status: this.fc.status.value,
                    branch: this.fc.branch.value,
                });
            }

            this.checkClearFilter();
        });

        this.immunisationFiltersForm
        .get('branch')
        .valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll)
        )
        .subscribe(value =>
        {
            this._logger.debug('[filter by status change]', value);

            this._immunisationService.onFilterChanged.next(this.getFormValues);

            this.checkClearFilter();
        });


    // Subscribe to immunisation list changes
    this._immunisationService
        .OnImmunisationChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((response: any) =>
        {
            this.immunisationFiltersForm[(response.total < 1) ? 'disable' : 'enable']({ emitEvent: false });

            // reset filter
            if (response.total < 1)
            {
                this.setFilterFormDefaults();
            }
        });

        // Subscribe to branch list changes
        this._immunisationService
            .onFilterBranchesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[filter by branch change]', response);

                this.branches = response;
            });
  }

  /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


  createFilterForm(): FormGroup
    {
        return new FormGroup({
            status: new FormControl(''),
            branch: new FormControl(null)
        });
    }

    setFilterFormDefaults(): void
    {
        this.immunisationFiltersForm.get('status').patchValue('2', { emitEvent: false });
        this.immunisationFiltersForm.get('branch').patchValue('none', { emitEvent: false });
        this.showFilterButton = false;
    }

    checkClearFilter(): void
    {
        this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();

        this.setFilterFormDefaults();

        // update table
        this._immunisationService.onFilterChanged.next(null);
    }
    get getFormValues(): any
    {
        return {
            status: this.fc.status.value,
            branch: this.fc.branch.value,
        };
    }

    get fc(): any
    {
        return this.immunisationFiltersForm.controls;
    }
    

}

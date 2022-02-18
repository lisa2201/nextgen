import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { UsersService } from '../../../services/users.service';

import { Branch } from 'app/main/modules/branch/branch.model';
import { CommonHelper } from 'app/utils/common.helper';


@Component({
    selector: 'manage-users-left-sidenav',
    templateUrl: './manage-users-left-sidenav.component.html',
    styleUrls: ['./manage-users-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ManageUsersLeftSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    
    branches: Branch[];
    showFilterButton: boolean;
    userDependencies: any;

    usersFiltersForm: FormGroup;

    formDefaultValues = {
        status: '',
        level: '0',
        branch: null
    };
    
    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {UsersService} _usersService
     */
    constructor(
        private _logger: NGXLogger,
        private _usersService: UsersService
    )
    {
        // Set defaults
        this.branches = [];
        this.showFilterButton = false;
        this.usersFiltersForm = this.createFilterForm();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('users left side nav!!!');

        // Subscribe to filter changes
        this.usersFiltersForm
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
                    this._usersService.onFilterChanged.next(this.getFormValues);
                }

                this.checkClearFilter();
            });

        this.usersFiltersForm
            .get('branch')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by status change]', value);

                this._usersService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
            });

        this.usersFiltersForm
            .get('level')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by level change]', value);

                this._usersService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
            });

        // Subscribe to branch list changes
        this._usersService
            .onFilterBranchesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[on branch change]', response);

                this.branches = response;

                if (this.branches.length > 0)
                {
                    // check if filter has last remember options
                    if (!_.isNull(this._usersService.filterBy))
                    {
                        this.setLastRememberOptions(this._usersService.filterBy);
                    }
                    // set default values
                    else
                    {
                        this.formDefaultValues.branch = _.head(this.branches).id;

                        this.setFilterFormDefaults();
                    }
                }
                else
                {
                    this.usersFiltersForm.disable({ emitEvent: false });    
                }
            });

        // Subscribe to user dependency changes
        this._usersService
            .onUserDependencyChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[on user dependency change]', response);

                this.userDependencies = response;
            });

        // Subscribe to users list changes
        this._usersService
            .onUsersChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this.usersFiltersForm[(response.total < 1) ? 'disable' : 'enable']({ emitEvent: false });

                // reset filter
                if (response.total < 1)
                {
                    this.setFilterFormDefaults();
                }
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

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.usersFiltersForm.controls;
    }

    get getFormValues(): any
    {
        return {
            status: this.fc.status.value,
            level: this.fc.level.value,
            branch: this.fc.branch.value,
        };
    }

    createFilterForm(): FormGroup
    {
        return new FormGroup({
            status: new FormControl(''),
            level: new FormControl(''),
            branch: new FormControl(null)
        });
    }

    setFilterFormDefaults(): void
    {
        this.usersFiltersForm.get('status').patchValue('', { emitEvent: false });
        this.usersFiltersForm.get('level').patchValue('0', { emitEvent: false });
        this.usersFiltersForm.get('branch').patchValue(_.head(this.branches).id, { emitEvent: false });

        this.showFilterButton = false;
    }

    setLastRememberOptions(values: any): void
    {
        for (const key in this.fc)
        {
            this.fc[key].patchValue(_.get(values, key), { emitEvent: false });
        }

        this.showFilterButton = true;
    }

    checkClearFilter(): void
    {
        this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();

        if (!_.isNull(this._usersService.filterBy))
        {
            this._usersService.clearLastRememberOptions();
        }

        // reset to default
        this.setFilterFormDefaults();
        
        // update table
        setTimeout(() => this._usersService.onFilterChanged.next(this.getFormValues));
    }
}


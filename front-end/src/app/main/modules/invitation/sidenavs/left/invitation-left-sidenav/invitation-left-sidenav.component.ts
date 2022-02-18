import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { InvitationService } from '../../../services/invitation.service';
import { Branch } from 'app/main/modules/branch/branch.model';
import { CommonHelper } from 'app/utils/common.helper';


@Component({
    selector: 'invitation-left-sidenav',
    templateUrl: './invitation-left-sidenav.component.html',
    styleUrls: ['./invitation-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InvitationLeftSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    branches: Branch[];
    showFilterButton: boolean;

    invitationFiltersForm: FormGroup;

    formDefaultValues = {
        status: '0',
        branch: null
    };

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {InvitationService} _invitationService
     */
    constructor(
        private _logger: NGXLogger,
        private _invitationService: InvitationService
    )
    {
        // Set defaults
        this.branches = [];
        this.showFilterButton = false;
        this.invitationFiltersForm = this.createFilterForm();

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
    ngOnInit(): void
    {
        this._logger.debug('invitation left side nav!!!');

        // Subscribe to filter changes
        this.invitationFiltersForm
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
                    this._invitationService.onFilterChanged.next({
                        status: this.fc.status.value,
                        branch: this.fc.branch.value,
                    });
                }

                this.checkClearFilter();
            });

        this.invitationFiltersForm
            .get('branch')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value =>
            {
                this._logger.debug('[filter by status change]', value);

                this._invitationService.onFilterChanged.next(this.getFormValues);

                this.checkClearFilter();
            });

        // Subscribe to branch list changes
        this._invitationService
            .onFilterBranchesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[filter by branch change]', response);

                this.branches = response;
            });

        // Subscribe to invitation list changes
        this._invitationService
            .onInvitationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this.invitationFiltersForm[(response.total < 1) ? 'disable' : 'enable']({ emitEvent: false });

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

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.invitationFiltersForm.controls;
    }

    get getFormValues(): any
    {
        return {
            status: this.fc.status.value,
            branch: this.fc.branch.value,
        };
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
        this.invitationFiltersForm.get('status').patchValue('0', { emitEvent: false });
        this.invitationFiltersForm.get('branch').patchValue(null, { emitEvent: false });

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
        this._invitationService.onFilterChanged.next(null);
    }
}

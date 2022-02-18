import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as ct from 'countries-and-timezones';

import { NGXLogger } from 'ngx-logger';

import { NotificationService } from 'app/shared/service/notification.service';
import { CommonService } from 'app/shared/service/common.service';
import { BranchService } from '../../services/branch.service';

import { AppConst } from 'app/shared/AppConst';
import { valueExists } from 'app/shared/validators/asynValidator';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { ProviderSetup } from 'app/main/modules/account-manager/provider-setup/models/provider-setup.model';
import { ServiceSetup } from 'app/main/modules/account-manager/service-setup/models/service-setup.model';

interface OpeningHours {
    index: string;
    disable: boolean;
    value: Array<number> | number | null;
}

@Component({
    selector: 'branch-new',
    templateUrl: './new.component.html',
    styleUrls: ['./new.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BranchAddDialogComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    action: string;
    dialogTitle: string;
    branchForm: FormGroup;
    editMode: boolean;
    buttonLoader: boolean;

    attendanceList: any;
    openHourMap: OpeningHours[];
    allChecked: boolean;
    indeterminate: boolean;
    openHoursFormStatus: string;
    defaultOpenHourValue: any;

    countries: any;
    selectedTimezone: any;
    providers: ProviderSetup[];
    services: ServiceSetup[];
    selectedServices: any;
    hasCCS: boolean;

    /**
     * Constructor
     *
     * @param {MatDialogRef<BranchAddDialogComponent>} matDialogRef
     * @param {RoleService} _roleService
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {BranchService} _branchService
     * @param _data
     */
    constructor(
        public matDialogRef: MatDialogRef<BranchAddDialogComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _branchService: BranchService,
        private _cd: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        this._logger.debug('[branch data]', _data);

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.action = _data.action;
        this.editMode = false;
        this.buttonLoader = false;

        this.attendanceList = this._commonService.getWeekDays();
        this.allChecked = false;
        this.indeterminate = false;
        this.openHoursFormStatus = '';
        this.openHourMap = [];

        this.countries = _data.countries;
        this.selectedTimezone = [];
        this.selectedServices = [];
        this.providers = _data.providers;
        this.hasCCS = _data.ccs;

        if (this.action === AppConst.modalActionTypes.EDIT)
        {
            this.dialogTitle = 'Edit Branch';
        }
        else
        {
            this.dialogTitle = 'New Branch';
        }

        console.log(ct.getCountry('AU'));

        this.branchForm = this.createBranchForm();

        this.addOpenHoursCheckbox();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        this.branchForm
            .get('country')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[country value change]', value);

                if (!_.isNull(value))
                {
                    this.branchForm.get('timezone').patchValue(null);

                    this.selectedTimezone = [...ct.getTimezonesForCountry(value)];
                }
            });

        this.branchForm
            .get('provider')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[provider value change]', value);

                if (!_.isNull(value))
                {
                    this.selectedServices = [];

                    const group = _.find(this.providers, ['id', value]);

                    if (group && _.keys(group.services).length > 0)
                    {
                        this.selectedServices = _.map(group.services);
                    }
                    else 
                    {
                        this.branchForm.get('service').patchValue(null, { emitEvent: false });
                    }
                }
                else
                {
                    this.selectedServices = [];
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
        return this.branchForm.controls;
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createBranchForm(): FormGroup
    {
        return new FormGroup({
            name: new FormControl(this.editMode ? this._data.response.roleRes.name : '', [
                Validators.required], [valueExists(this._commonService, 'branch.name')]),
            email: new FormControl(this.editMode ? this._data.response.roleRes.email : '', [Validators.required, Validators.email]),
            domain: new FormControl(this.editMode ? this._data.response.roleRes.domain : '', [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(100),
                Validators.pattern('^[a-zA-Z0-9_-]+$')
            ], [valueExists(this._commonService, 'branch.domain')]),
            desc: new FormControl(this.editMode ? this._data.response.roleRes.desc : '', [Validators.maxLength(250)]),
            status: new FormControl(this.editMode ? this._data.response.roleRes.status : true, [Validators.required]),
            country: new FormControl(this.editMode ? this._data.response.roleRes.country : null, [Validators.required]),
            timezone: new FormControl(this.editMode ? this._data.response.roleRes.tz : null, [Validators.required]),
            open_days: new FormArray([], [minSelectedCheckboxes(), this.validateOpeningHours.bind(this)]),
            provider: new FormControl(this.editMode ? '' : null, this.hasCCS ? [Validators.required] : []),
            service: new FormControl(this.editMode ? '' : null, this.hasCCS ? [Validators.required] : []),
            pincode: new FormControl(this.editMode ? this._data.response.roleRes.pincode : '', [Validators.maxLength(20)]),
        });
    }

    /**
     * add open hours to form array"
     */
    addOpenHoursCheckbox(): void
    {
        this.attendanceList.forEach((v: any, i: number) =>
        {
            const control = new FormControl(false);
            (this.fc.open_days as FormArray).push(control);

            // create open hours map
            this.openHourMap.push({
                index: v.index,
                disable: true,
                value: [540, 1080] // default 9:00 AM - 6:00PM
            });
        });
    }

    /**
     * check if open hours has error
     */
    hasOpenHoursFormError(): void
    {
        this.openHoursFormStatus = (this.branchForm.get('open_days').hasError('required') && this.branchForm.get('open_days').touched) ? 'error' : '';
    }

    /**
     * check if open hours has value
     *
     * @returns {boolean}
     */
    validateOpeningHours(): boolean
    {  
        return (this.openHourMap.filter(i => !i.disable).filter(i => _.isArray(i.value) ? _.isEmpty(i.value) : _.isNull(i.value))).length > 0;
    }

    /**
     * check for valid time
     *
     * @param {*} value
     * @returns {boolean}
     */
    checkOpenHourHasValue(value: any): boolean
    {
        return _.isNull(value) || _.isEmpty(value);
    }

    /**
     * update all open hours items
     */
    checkAll(value: boolean): void
    {
        this.fc.open_days
            .patchValue(this.fc.open_days.value.map(() => this.allChecked), { emitEvent: false });

        this.attendanceList.map((v: any, i: number) => this.openHourMap[v.index].disable = !value);
        
        this.refreshStatus();
    }

    /**
     * update single open hours
     */
    updateSingleChecked(day: any, event: MouseEvent): void
    {
        event.preventDefault();

        this.openHourMap[day.index].disable = !this.openHourMap[day.index].disable;

        this.refreshStatus();
    }

    /**
     * check indeterminate status and open hours error label
     */
    refreshStatus(): void
    {
        // error message fix
        this.fc.open_days.markAllAsTouched();

        const allChecked = this.fc.open_days.value.every((value: boolean) => value === true);
        const allUnChecked = this.fc.open_days.value.every((value: boolean) => value === false);

        this.allChecked = allChecked;
        this.indeterminate = !allChecked && !allUnChecked;

        // check validation
        this.hasOpenHoursFormError();
    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.branchForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.openHoursFormStatus = '';
        this.allChecked = false;
        this.indeterminate = false;

        // create open hours map
        this.openHourMap = [];
        this.attendanceList.forEach((v: any, i: number) =>
        {
            this.openHourMap.push({
                index: v.index,
                disable: true,
                value: [540, 1080] // default 9:00 AM - 6:00PM
            });
        });

        this.selectedTimezone = [];
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.branchForm.invalid)
        {
            return;
        }

        const sendObj = {
            name: this.fc.name.value,
            email: this.fc.email.value,
            domain: this.fc.domain.value,
            desc: this.fc.desc.value,
            status: this.fc.status.value,
            country: this.fc.country.value,
            timezone: this.fc.timezone.value,
            service: this.fc.service.value,
            open_days: this.openHourMap,
            pincode: this.fc.pincode.value
        };

        this._logger.debug('[branch object]', sendObj);

        this.buttonLoader = true;

        this._branchService
            .storeBranch(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                res =>
                {
                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

}

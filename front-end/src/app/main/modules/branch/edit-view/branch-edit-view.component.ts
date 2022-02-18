import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as ct from 'countries-and-timezones';

import { NGXLogger } from 'ngx-logger';
import { NzModalService } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NotificationService } from 'app/shared/service/notification.service';
import { BranchService } from '../services/branch.service';
import { CommonService } from 'app/shared/service/common.service';
import { BranchEditService } from '../services/branch-edit.service';

import { Branch } from '../branch.model';

import { valueExists } from 'app/shared/validators/asynValidator';
import { ProviderSetup } from '../../account-manager/provider-setup/models/provider-setup.model';
import { ServiceSetup } from '../../account-manager/service-setup/models/service-setup.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';

interface OpeningHours {
    index: string;
    disable: boolean;
    value: Array<number> | number | null;
}

@Component({
    selector: 'branch-edit-view',
    templateUrl: './branch-edit-view.component.html',
    styleUrls: ['./branch-edit-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BranchEditViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    branchForm: FormGroup;
    branch: Branch;
    buttonLoader: boolean;
    countries: any;
    selectedTimezone: any;

    service: ServiceSetup;
    providers: ProviderSetup[];
    selectedServices: ServiceSetup[];
    hasCCS: boolean;
    updateButtonsTriggered: boolean;

    attendanceList: any;
    openHourMap: OpeningHours[];
    allChecked: boolean;
    indeterminate: boolean;
    openHoursFormStatus: string;
    defaultOpenHourValue: any;
    
    current: number;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {BranchService} _roleService
     * @param {MatDialog} _matDialog
     * @param {NzModalService} _modalService
     * @param {CommonService} _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _branchService: BranchService,
        private _branchEditService: BranchEditService,
        private _modalService: NzModalService,
        private _commonService: CommonService,
        private _router: Router
    )
    {
        // Set defaults
        this.countries = [];
        this.selectedTimezone = [];
        this.buttonLoader = false;
        this.selectedServices = [];
        this.updateButtonsTriggered = false;

        this.attendanceList = this._commonService.getWeekDays();
        this.allChecked = false;
        this.indeterminate = false;
        this.openHoursFormStatus = '';
        this.openHourMap = [];

        this.current = 0;

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
        this._logger.debug('branch edit');

        // Subscribe to branch changes
        this._branchEditService
            .onBranchChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => 
            {
                this._logger.debug('[branch]', response);
                
                this.branch = response.branch;
                this.countries = response.countries;
                this.providers = response.providers;
                this.hasCCS = response.ccs;

                // set form
                this.branchForm = this.createBranchForm();

                this.onChanges();
                
                this.setBranchFormValues();

                this.addOpenHoursCheckbox();
            });
    }

    /**
     * form on change events
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

        // Subscribe to branch status changes
        /*this._branchService
            .onBranchStatusChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((res: any) => 
            {
                this._logger.debug('[branch update status]', res);
                
                this.branch.status = res.status;
            });*/
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
            name: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z0-9-._ \-\']+')]),
            email: new FormControl('', [Validators.required, Validators.email]),
            domain: new FormControl({ value: '', disabled: true }),
            desc: new FormControl('', [Validators.maxLength(250)]),
            status: new FormControl(true, [Validators.required]),
            country: new FormControl(null, [Validators.required]),
            timezone: new FormControl(null, [Validators.required]),
            provider: new FormControl(null, this.hasCCS ? [Validators.required] : []),
            service: new FormControl(null,  this.hasCCS ? [Validators.required] : []),
            open_days: new FormArray([], [minSelectedCheckboxes(), this.validateOpeningHours.bind(this)]),

            // non required
            phone: new FormControl('', [Validators.maxLength(20)]),
            fax: new FormControl('', [Validators.maxLength(20)]),
            address1: new FormControl('', [Validators.maxLength(200)]),
            address2: new FormControl('', [Validators.maxLength(250)]),
            city: new FormControl('', [Validators.maxLength(120)]),
            zip_code: new FormControl('', [Validators.maxLength(32)]),
            pincode: new FormControl('', [Validators.maxLength(20)]),
        });
    }
    
    /**
     * Set edit form values
     *
     */
    setBranchFormValues(): void
    {
        try
        {
            this.branchForm.get('name').setValue(this.branch.name);
            this.branchForm.get('email').setValue(this.branch.email);
            this.branchForm.get('domain').setValue(`${this.branch.domain}.kinderm8.com.au`);
            this.branchForm.get('desc').setValue(this.branch.desc);
            this.branchForm.get('status').setValue(this.branch.status);
            this.branchForm.get('country').setValue(this.branch.country);
            this.branchForm.get('timezone').setValue(this.branch.timeZone);
            
            this.branchForm.get('open_days').setValue(this.openHourMap);

            this.branchForm.get('service').setValue(this.branch.service ? this.branch.service.id : null);
            this.branchForm.get('provider').setValue(this.branch.service && this.branch.service.provider ? this.branch.service.provider.id : null);

            this.branchForm.get('phone').setValue(this.branch.phoneNumber);
            this.branchForm.get('fax').setValue(this.branch.faxNumber);
            this.branchForm.get('zip_code').setValue(this.branch.zipCode);
            this.branchForm.get('address1').setValue(this.branch.addressLine1);
            this.branchForm.get('address2').setValue(this.branch.addressLine2);
            this.branchForm.get('city').setValue(this.branch.city);
            this.branchForm.get('pincode').setValue(this.branch.pincode);

            // set form to valid status
            // this.branchForm.markAllAsTouched();

            // AsyncValidators fix
            setTimeout(() =>
            {
                this.branchForm.get('name').setAsyncValidators([valueExists(this._commonService, 'branch.name', this.branch.id)]);
                this.branchForm.get('pincode').setAsyncValidators([valueExists(this._commonService, 'branch.pincode', this.branch.id)]);
            }, 500);
    
        }
        catch (err)
        {
            throw err;   
        }
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    /**
     * tab navigation previous
     */
    pre(): void
    {
        this.current -= 1;
    }

    /**
     * tab navigation new
     */
    next(): void
    {
        this.current += 1;
    }

    /**
     * update tab navigation position
     */
    updatePosition(index: number): void
    {   
        this.current = index;
    }

     /**
     * add open hours to form array
     */
    addOpenHoursCheckbox(): void
    {
        this.attendanceList.forEach((v: any, i: number) =>
        {
            const selectedDay = _.find(this.branch.openingHours, ['index', v.index]);
            
            const control = new FormControl(!selectedDay.disable);
            (this.fc.open_days as FormArray).push(control);

            // create open hours map
            this.openHourMap.push({
                index: selectedDay.index,
                disable: selectedDay.disable,
                value: selectedDay.disable ? null : selectedDay.value
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

        for (const key in this.fc) {
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
                value: null,
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
            id: this.branch.id,
            name: this.fc.name.value,
            email: this.fc.email.value,
            desc: this.fc.desc.value,
            status: this.fc.status.value,
            country: this.fc.country.value,
            timezone: this.fc.timezone.value,
            service: this.fc.service.value,
            open_days: this.openHourMap,
            //
            phone: this.fc.phone.value,
            fax: this.fc.fax.value,
            address1: this.fc.address1.value,
            address2: this.fc.address2.value,
            zipcode: this.fc.zip_code.value,
            city: this.fc.city.value,
            pincode: this.fc.pincode.value
        };

        this._logger.debug('[branch object]', sendObj);

        this.buttonLoader = true;

        this._branchEditService
            .updateBranch(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                message => 
                {
                    this._notification.clearSnackBar();
    
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
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

    /**
     * update status
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    updateStatus( e: MouseEvent): void
    {
        e.preventDefault();

        // prevent from multiple clicks
        if (this.updateButtonsTriggered)
        {
            return;    
        }
        
        this.updateButtonsTriggered = true;

        this.branch.statusLoading = true;

        const sendObj = {
            id: this.branch.id,
            status: !this.branch.status
        };

        this._branchService
            .updateStatus(sendObj, this.branch.index)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                {
                    setTimeout(() =>
                    {
                        this.branch.statusLoading = false;
                        this.updateButtonsTriggered = false;
                    }, 250);
                })
            )
            .subscribe(
                message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                error =>
                {
                    throw error;
                }
            );
    }

}

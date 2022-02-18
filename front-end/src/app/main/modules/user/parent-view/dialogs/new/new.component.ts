import { Component, OnInit, ViewEncapsulation, Inject, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';

import { NotificationService } from 'app/shared/service/notification.service';
import { UsersService } from 'app/main/modules/user/services/users.service';
import { CommonService } from 'app/shared/service/common.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { valueExists } from 'app/shared/validators/asynValidator';
import * as ct from 'countries-and-timezones';

@Component({
    selector: 'parent-new',
    templateUrl: './new.component.html',
    styleUrls: ['./new.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ParentAddDialogComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    parentForm: FormGroup;
    buttonLoader: boolean;
    countries: any;
    selectedState: any;

    /**
     * Constructor
     *
     * @param {MatDialogRef<ParentAddDialogComponent>} matDialogRef
     * @param {RoleService} _roleService
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {UsersService} _userService
     * @param {Router} _router
     * @param _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ParentAddDialogComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _userService: UsersService,
        private _router: Router,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        this._logger.debug('[child data]', _data);

        // Set the defaults
        this.buttonLoader = false;
        this.dialogTitle = 'Create New Profile';
        this.countries = _data.countries;
        this.selectedState = [];

        this.parentForm = this.createParentForm();

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
        this._logger.debug('parent add view !!!');
        
        // this.parentForm.get('country').patchValue('AU');
        // this.selectedState = [...ct.getTimezonesForCountry('AU')];
        // AsyncValidators fix
        setTimeout(() =>
        {
            this.parentForm.get('email').setAsyncValidators([valueExists(this._commonService, 'user.email')]);
            this.parentForm.get('sec_email').setAsyncValidators([valueExists(this._commonService, 'user.email')]);
            this.parentForm.get('phone').setAsyncValidators([valueExists(this._commonService, 'user.phone')]);
        }, 500);

        this.parentForm
            .get('country')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[country value change]', value);

                if (!_.isNull(value))
                {
                    this.parentForm.get('state').patchValue(null);

                    this.selectedState = this.getState(value);
                }
            });

        
    }

    getState(value): any {
        return _.filter(this.countries,(country)=> country.code2 === value)[0].states
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
        return this.parentForm.controls; 
    }

    /**
     * disable future dates
     */
    disabledDate = (current: Date): boolean =>
    {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createParentForm(): FormGroup
    {
        return new FormGroup({
            f_name: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z 0-9_)(-]+$'), Validators.maxLength(150)]),
            l_name: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z 0-9_)(-]+$'), Validators.maxLength(150)]),
            date_of_birth: new FormControl('', [Validators.required]),
            email: new FormControl('', [Validators.required, Validators.email]),
            sec_email: new FormControl('', [Validators.email, this.SecEmailValidator]),
            phone: new FormControl('', [Validators.maxLength(50)]),
            mobile: new FormControl('', [Validators.maxLength(50)]),
            address_1: new FormControl('', [Validators.maxLength(320)]),
            address_2: new FormControl('', [Validators.maxLength(320)]),            
            city: new FormControl('', [Validators.maxLength(120)]),
            zip_code: new FormControl('', [Validators.pattern('^[0-9]*$')]),
            continue_edit: new FormControl(false),
            country: new FormControl(null, []),
            state: new FormControl(null, []),
            work_phone: new FormControl('', [Validators.maxLength(50)]),
            work_mobile: new FormControl('', [Validators.maxLength(50)]),
        });
    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.parentForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.parentForm.invalid) 
        {
            return;
        }
        

        const sendObj = {
            firstname: this.fc.f_name.value,           
            lastname: this.fc.l_name.value,
            dob: DateTimeHelper.getUtcDate(this.fc.date_of_birth.value),
            email: this.fc.email.value,
            needsec_email: true,
            secondaryemail: this.fc.sec_email.value,
            phone: this.fc.phone.value,
            mobile: this.fc.mobile.value,
            address1: this.fc.address_1.value,
            address2: this.fc.address_2.value,
            city: this.fc.city.value,
            zipcode: this.fc.zip_code.value,
            password: 'temperory_password',
            status: '0',
            country: this.fc.country.value,
            state: this.fc.state.value,
            work_phone: this.fc.work_phone.value,
            work_mobile: this.fc.work_mobile.value,
            role_name: 'parent',
        };

        this._logger.debug('[parent object]', sendObj);

        this.buttonLoader = true;

        this._userService
            .storeParent(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res =>
                {
                    this.buttonLoader = false;

                    if (this.fc.continue_edit.value)
                    {
                        this._router.navigateByUrl(`manage-parents/user/${res.data}`);
                    }

                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res.message), 250);
                },
                error =>
                {
                    this.buttonLoader = false;

                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    updateSecEmailValidator(): void {
        /** wait for refresh value */
        Promise.resolve().then(() => this.fc.sec_email.updateValueAndValidity());
    }

    SecEmailValidator = (control: FormControl): { [s: string]: boolean } => {

        if (!control.parent || !control) {
            return {};
        }

        if (control.value === '') {
            return {};
        }

        if (control.value ===  control.parent.get('email').value) {
            return { duplicate: true, error: true };
        }
        return {};
    };

    trackByFn(index: number, item: any): number
    {
        return index;
    }

}
import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators, AsyncValidatorFn, AbstractControl } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, map, catchError, first } from 'rxjs/operators';

import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { helpMotion } from 'ng-zorro-antd';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { OrganizationService } from '../../services/organization.service';

@Component({
    selector: 'app-new-or-edit',
    templateUrl: './new-or-edit.component.html',
    styleUrls: ['./new-or-edit.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class NewOrEditComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    action: string;
    dialogTitle: string;
    organizationForm: FormGroup;
    editMode: boolean;
    buttonLoader: boolean;
    // organizations: Organization[];
    levels: any;
    showRolesControl: boolean;


    /**
     * Constructor
     * @param matDialogRef 
     * @param {NGXLogger} _logger 
     * @param {OrganizationService} _organizationService 
     * @param {any} _data 
     */
    constructor(
        public matDialogRef: MatDialogRef<NewOrEditComponent>,
        private _logger: NGXLogger,
        private _organizationService: OrganizationService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {



        this._logger.debug('[organization data]', _data);
        this.editMode = false;
        this.buttonLoader = false;
        this.showRolesControl = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.action = _data.action;
        // this.levels = _data.response.depends.levels;

        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Organization';
            this.editMode = (_data.response && _data.response.organization);
        }
        else {
            this.dialogTitle = 'New Organization';
        }

        this.organizationForm = this.createForm();

        // this.setAsyncValidators();
    }



    /**
     * On Init
     */
    ngOnInit(): void {
       
        this._logger.debug('organization list view!!!');
        this.onChanges();
    }


    /**
     * On Changes
     */
    onChanges(): void {
        //
    }


    /**
     * On Destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get fc(): any {
        return this.organizationForm.controls;
    }


    /**
     * Form
     */
    createForm(): FormGroup {
        // 
        return new FormGroup({
            email: new FormControl(this.editMode ? this._data.response.organization.email : '', [Validators.required, Validators.email]),
            company_name: new FormControl(this.editMode ? this._data.response.organization.companyName : null, [Validators.required]),
            // first_name: new FormControl(this.editMode ? this._data.response.organization.first_name : '', [Validators.required]),
            // last_name: new FormControl(this.editMode ? this._data.response.organization.last_name : null, [Validators.required]),
            phone_number: new FormControl(this.editMode ? this._data.response.organization.phoneNumber : ''),
            address_1: new FormControl(this.editMode ? this._data.response.organization.address1 : null),
            address_2: new FormControl(this.editMode ? this._data.response.organization.address2 : ''),
            city: new FormControl(this.editMode ? this._data.response.organization.city : null),
            country: new FormControl(this.editMode ? this._data.response.organization.country : null),

        });
    }



    /**
     * Set Async Validators
     */
    setAsyncValidators(): void {
        setTimeout(() => {
            this.organizationForm.get('email').setAsyncValidators([this.emailExistsValidator(this.editMode ? this._data.response.organization.id : '')]);

        }, 500);
    }



    /**
     * Email Exists
     * @param {string} id 
     */
    emailExistsValidator(id: string = ''): AsyncValidatorFn {
        return (control: AbstractControl) => control
            .valueChanges
            .pipe(
                debounceTime(800),
                distinctUntilChanged(),
                switchMap(() => this._organizationService.emailExists(control.value, id)),
                map((unique: boolean) => (!unique ? null : { 'exists': true })),
                catchError(() => of({ 'exists': true })),
                first()
            );
    }


    /**
     * Reset Form
     * @param {MouseEvent} e 
     */
    resetForm(e: MouseEvent): void {
        if (e) { e.preventDefault(); }

        if (e) {
            this.showRolesControl = false;
            // this.selectedRoles = [];
        }

        this.organizationForm.reset();

        for (const key in this.fc) {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }
    }


    /**
     * Form Submit
     * @param {MouseEvent} e 
     */
    onFormSubmit(e: MouseEvent): void {
        e.preventDefault();

        if (this.organizationForm.invalid) {
            return;
        }

        const sendObj = {
            email: this.fc.email.value,
            company_name: this.fc.company_name.value,
            // first_name: this.fc.first_name.value,
            // last_name: this.fc.last_name.value,

            phone_number: this.fc.phone_number.value,
            address_1: this.fc.address_1.value,
            address_2: this.fc.address_2.value,
            city: this.fc.city.value,
            country: this.fc.country.value,
            // selectedRoles: selectedRoleIds,
            org: ''
        };

        if (this.editMode) { sendObj['id'] = this._data.response.organization.id; }


        this._logger.debug('[organization object]', sendObj);
        this.buttonLoader = true;

        this._organizationService[this.editMode ? 'updateOrganization' : 'storeOrganization'](sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => {
                    this.buttonLoader = false;
                    this.resetForm(null);
                    setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error => {
                    this.buttonLoader = false;
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');

                }
            );
    }

}

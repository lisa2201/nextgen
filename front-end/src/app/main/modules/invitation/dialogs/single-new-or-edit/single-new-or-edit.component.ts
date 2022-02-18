import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators, FormArray, AsyncValidatorFn, AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Subject, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, map, catchError, first, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { NzModalService, NzModalRef } from 'ng-zorro-antd';

import { InvitationService } from '../../services/invitation.service';

import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';

import { AppConst } from 'app/shared/AppConst';

import { Branch } from 'app/main/modules/branch/branch.model';
import { Role } from 'app/main/modules/role/role.model';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { InvitationSetRolesComponent } from '../../modals/invitation-set-roles/invitation-set-roles.component';

@Component({
    selector: 'invitation-single-new-or-edit',
    templateUrl: './single-new-or-edit.component.html',
    styleUrls: ['./single-new-or-edit.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InvitationSingleNewOrEditComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    action: string;
    dialogTitle: string;
    
    invitationForm: FormGroup;
    
    editMode: boolean;
    buttonLoader: boolean;

    branch: Branch;
    roles: Role[];
    levels: any;
    
    selectedRoles: Role[];
    showRolesControl: boolean;
    rolesFormStatus: string;

    mapOfBranchRoles: { [key: string]: { roles: string[], type: string } } = {};

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<InvitationSingleNewOrEditComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {InvitationService} _invitationService
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<InvitationSingleNewOrEditComponent>,
        private _logger: NGXLogger,
        private _invitationService: InvitationService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        this._logger.debug('[invitation data]', _data);

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.editMode = false;
        this.buttonLoader = false;
        this.showRolesControl = false;

        this.rolesFormStatus = '';
        this.action = _data.action;
        this.roles = _data.response.depends.roles;
        this.levels = _data.response.depends.levels;
        this.branch = _.head(_data.response.depends.branches);

        if ( this.action === AppConst.modalActionTypes.EDIT )
        {
            this.dialogTitle = 'Edit Invitation';
            this.editMode = (_data.response && _data.response.invitation) ? true : false;
            this.mapOfBranchRoles = _data.response.invitation.assignRoles;
        }
        else
        {
            this.dialogTitle = 'New Invitation'; 
        }

        this.invitationForm = this.createForm();

        this.setAsyncValidators();
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

        // set default value
        this.invitationForm
            .get('type')
            .patchValue(this.editMode ? this.mapOfBranchRoles[this.branch.id].type : _.head(_.keys(this.levels).sort()));

        // check for parent type - disable option
        if (this.editMode)
        {
            this.addCheckboxes(this.mapOfBranchRoles[this.branch.id].type);

            this.onCheckboxChange(true);
        }
    }

    onChanges(): void
    {
        this.invitationForm
            .get('type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(val => this.addCheckboxes(val));

        this.invitationForm
            .get('roles')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.hasRolesFormError());
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
        return this.invitationForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            email: new FormControl(this.editMode ? this._data.response.invitation.email : '', [Validators.required, Validators.email]),
            type: new FormControl(null, [Validators.required]),
            roles: new FormArray([], minSelectedCheckboxes())
        });
    }

    /**
     * Set async validators (AsyncValidators fix edit form)
     */
    setAsyncValidators(): void
    {
        setTimeout(() =>
        {
            this.invitationForm.get('email').setAsyncValidators([this.emailExistsValidator(this.editMode ? this._data.response.invitation.id : '')]);
        }, 500);
    }

    /**
     * async email validator
     *
     * @param {string} [id='']
     * @returns {AsyncValidatorFn}
     */
    emailExistsValidator(id: string = ''): AsyncValidatorFn
    {
        return (control: AbstractControl) => control
            .valueChanges
            .pipe(
                debounceTime(800),
                distinctUntilChanged(),
                switchMap(() => this._invitationService.emailExists(control.value, id)),
                map((unique: boolean) => (!unique ? null : { 'exists': true })),
                catchError(() => of({ 'exists': true })),
                first()
            );
    }

    /**
     * add roles to form array
     *
     * @param {string} value
     * @returns {void}
     */
    addCheckboxes(value: string): void 
    {
        if (!value) { return; }

        // reset list
        (this.fc.roles as FormArray).clear();

        this.selectedRoles = _.filter(this.roles, ['group', _.head(_.filter(this.levels, (o, k) => k === value))])
            .map((o, i) =>
            {
                o.index = i;
                return o;
            });

        this.selectedRoles.map((o: any, i: number) => 
        {
            const control = new FormControl(this.editMode ? _.indexOf(this.mapOfBranchRoles[this.branch.id].roles, o.id) > -1 : false);
            (this.fc.roles as FormArray).push(control);
        });

        this.showRolesControl = true;
    }

    /**
     * check for role type changes
     *
     * @param {boolean} value
     * @returns {void}
     */
    onCheckboxChange(value: boolean): void
    {
        if (_.findKey(this.levels, o => o === AppConst.roleLevel.PARENT) !== this.fc.type.value)
        {
            return;
        }
    
        const checked = this.fc.roles.value.filter((v: any) => v).length > 0;
    
        if (checked)
        {
            this.fc.roles.value.forEach((v: any, i: number) => (this.fc.roles as FormArray).at(i)[v ? 'enable' : 'disable']({ emitEvent: false }));
        }
        else
        {
            (this.fc.roles as FormArray).enable({ emitEvent: false });
        }
    }

    /**
     * check if role has error
     */
    hasRolesFormError(): void
    {
        this.rolesFormStatus = (this.invitationForm.get('roles').hasError('required') && this.invitationForm.get('roles').touched) ? 'error' : '';
    }

    /**
     * check if role type available
     */
    displayLevelSelection(): boolean
    {
        return _.isObject(this.levels) && !_.isEmpty(this.levels) && Object.keys(this.levels).length > 1;
    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.invitationForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.rolesFormStatus = '';
        this.showRolesControl = false;
        this.mapOfBranchRoles = {};
        
        this.fc.type.patchValue(_.head(_.keys(this.levels).sort()));
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.invitationForm.invalid) 
        {
            return;
        }

        const selectedRoleIds = this.invitationForm.getRawValue().roles
            .map((v: any, i: string | number) => v ? this.selectedRoles[i] : null)
            .filter((v: any) => v !== null)
            .map((v: any) => v.id);

        this.mapOfBranchRoles[this.branch.id] = {
            roles: selectedRoleIds,
            type: this.fc.type.value
        };

        const data = {
            email: this.fc.email.value,
            type: '0',
            role_map: this.mapOfBranchRoles,
            branch: this.branch.id,
            org: null
        };

        if (this.editMode) { data['id'] = this._data.response.invitation.id; }

        this._logger.debug('[invitation object]', data);

        this.buttonLoader = true;

        this._invitationService[this.editMode ? 'updateInvitation' : 'storeInvitation'](data)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                res =>
                {

                    if (!this.editMode)
                    {
                        this.resetForm(null);
                    }

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

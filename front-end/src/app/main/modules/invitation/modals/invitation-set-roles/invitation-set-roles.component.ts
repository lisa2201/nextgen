import { Component, OnInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef } from 'ng-zorro-antd';

import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';

import { AppConst } from 'app/shared/AppConst';

import { Role } from 'app/main/modules/role/role.model';

import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';

@Component({
    selector: 'modal-invitation-set-roles',
    templateUrl: './invitation-set-roles.component.html',
    styleUrls: ['./invitation-set-roles.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InvitationSetRolesComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    
    invitationAddRolesForm: FormGroup;

    selectedRoles: Role[];
    showRolesControl: boolean;
    editMode: boolean;
    rolesFormStatus: string;

    @Input('type')
    set type(value: string)
    {
        this.editMode = _.isString(value) && value === AppConst.modalActionTypes.EDIT;
    }

    @Input() editItem: any;
    @Input() roles: Role[];
    @Input() levels: any;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef
    )
    {
        this._logger.debug('[invitation add roles]');

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.editMode = false;
        this.showRolesControl = false;

        this.invitationAddRolesForm = this.createForm();
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
        this.invitationAddRolesForm
            .get('type')
            .patchValue(this.editMode ? this.editItem.type : _.head(_.keys(this.levels).sort()));

        if (this.editMode)
        {
            this.addCheckboxes(this.editItem.type);    

            this.onCheckboxChange(true);
        }
    }

    onChanges(): void
    {
        this.invitationAddRolesForm
            .get('type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(val => this.addCheckboxes(val));

        this.invitationAddRolesForm
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
        return this.invitationAddRolesForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            type: new FormControl(null, [Validators.required]),
            roles: new FormArray([], minSelectedCheckboxes())
        });
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

        this.selectedRoles.map((o, i) => 
        {
            const control = new FormControl(this.editMode ? _.indexOf(this.editItem.roles, o.id) > -1 : false);
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
        this.rolesFormStatus = (this.invitationAddRolesForm.get('roles').hasError('required') && this.invitationAddRolesForm.get('roles').touched) ? 'error' : '';
    }

    getValues(): any
    {
        return {
            roles: this.invitationAddRolesForm.getRawValue().roles
                    .map((v, i) => v ? this.selectedRoles[i] : null)
                    .filter(v => v !== null)
                    .map(v => v.id),
            type: this.fc.type.value,
            action: this.editMode ? AppConst.modalActionTypes.EDIT : AppConst.modalActionTypes.NEW
        };    
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}

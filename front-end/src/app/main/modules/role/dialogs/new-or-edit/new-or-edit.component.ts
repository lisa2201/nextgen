import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { RoleService } from '../../services/role.service';
import { CommonService } from 'app/shared/service/common.service';

import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';

import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { AppConst } from 'app/shared/AppConst';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { Permission } from 'app/main/modules/permission/permission.model';

@Component({
    selector: 'role-new-or-edit',
    templateUrl: './new-or-edit.component.html',
    styleUrls: ['./new-or-edit.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class RoleAddOrEditDialogComponent implements OnInit, OnDestroy
{
    private _unsubscribeAll: Subject<any>;

    action: string;
    dialogTitle: string;
    
    roleForm: FormGroup;

    editMode: boolean;
    buttonLoader: boolean;
    
    roleLevels: any;
    permissions: Permission[];
    permissionFormStatus: string;
    hasPermissionData: boolean;
    allChecked: boolean;
    indeterminate: boolean;
    colorCode: string;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {MatDialogRef<RoleAddOrEditDialogComponent>} matDialogRef
     * @param {RoleService} _roleService
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param _data
     */
    constructor(
        public matDialogRef: MatDialogRef<RoleAddOrEditDialogComponent>,
        private _roleService: RoleService,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        this._logger.debug('[role data]', _data);

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.editMode = false;
        this.buttonLoader = false;

        this.allChecked = false;
        this.indeterminate = false;

        this.permissionFormStatus = '';
        this.action = _data.action;
        this.roleLevels = _data.response.depends.levels;
        this.permissions =  [];
        this.colorCode = '';
        
        if ( this.action === AppConst.modalActionTypes.EDIT )
        {
            this.dialogTitle = 'Edit Role';
            this.editMode = (_data.response && _data.response.role) ? true : false;
            this.colorCode = (_data.response.role.color) ? _data.response.role.color : '';
        }
        else
        {
            this.dialogTitle = 'New Role';
        }

        this.roleForm = this.createRoleForm();
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

        if (this.editMode)
        {
            this.addCheckboxes(this._data.response.role.type);    
        }
    }

    onChanges(): void
    {
        // Subscribe to form value changes
        this.roleForm
            .get('level')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(level => this.addCheckboxes(level));

        this.roleForm
            .get('perms')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.updateSingleChecked());
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
        return this.roleForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createRoleForm(): FormGroup
    {
        return new FormGroup({
            name: new FormControl({ value: this.editMode ? this._data.response.role.name : '', disabled: this.editMode }, [Validators.required, Validators.pattern('^[a-zA-Z- ]+$')]),
            display: new FormControl(this.editMode ? this._data.response.role.display : '', [Validators.required, Validators.pattern('^[a-zA-Z \-\']+')]),
            desc: new FormControl(this.editMode ? this._data.response.role.desc : '', [Validators.maxLength(250)]),
            admin_privileges: new FormControl(this.editMode ? this._data.response.role.hasAdminPrivileges : false), 
            perms: new FormArray([], minSelectedCheckboxes()),
            level: new FormControl(this.editMode ? this._data.response.role.type : null, [Validators.required])
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
        // clear permission list
        this.permissions = [];

        if (!value)
        {
            setTimeout(() => this.directiveScroll.update(true), 250);
            
            return;
        }

        setTimeout(() =>
        {
            // reset list
            (this.fc.perms as FormArray).clear();

            // filtered permission list
            this.permissions = _.filter(this._data.response.depends.perms, (item: Permission) => _.indexOf(item.group, value) > -1)
            // reset index
            .map((o, i) =>
            {
                o.index = i;
                return o;
            });
    
            this.permissions.map((o, i) => 
            {
                const control = new FormControl(this.editMode ? _.indexOf(this._data.response.role.permissions, o.id) > -1 : false);
                (this.fc.perms as FormArray).push(control);
    
                // set selected on edit mode
                o.setSelectedStatus(this.editMode && _.indexOf(this._data.response.role.permissions, o.id) > -1);
            });

            setTimeout(() => this.directiveScroll.update(true));

        }, 50);
    }

    /**
     * check if role selection has error
     */
    hasPermissionFormError(): void
    {
        this.permissionFormStatus = (this.roleForm.get('perms').hasError('required') && this.roleForm.get('perms').touched) ? 'error' : '';
    }

    /**
     * update all role items
     */
    updateAllChecked(): void
    {
        this.indeterminate = false;

        this.fc.perms
            .patchValue(this.roleForm.getRawValue().perms.map(() => this.allChecked), { emitEvent: false });

        this.fc.perms.markAllAsTouched();

        this.hasPermissionFormError();

        setTimeout(() =>
        {    
            _.forEach(this.permissions, (i: Permission) =>
            {
                i.isSelected = this.allChecked;
    
                (!i.isParent)
                    ? (this.fc.perms as FormArray).at(i.index)[this.allChecked ? 'enable' : 'disable']()
                    : (this.fc.perms as FormArray).at(i.index).enable();
            });
        }, 50);
    }

    /**
     * update single role item
     */
    updateSingleChecked(): void
    {
        if (this.fc.perms.value.every((item: boolean) => item === false))
        {
            this.allChecked = false;
            this.indeterminate = false;
        }
        else if (this.fc.perms.value.every((item: boolean) => item === true))
        {
            this.allChecked = true;
            this.indeterminate = false;
        }
        else
        {
            this.indeterminate = true;
        }

        this.hasPermissionFormError();
    }

    /**
     * validate if permission group item selected
     *
     * @param {*} value
     * @param {Permission[]} data
     * @param {Permission} item
     * @returns {void}
     */
    onCheckboxChange(value: any, data: Permission[], item: Permission): void
    {
        // checked value
        // const value = (this.fc.perms as FormArray).at(item.index).value;

        if (_.isNull(value))
        {
            return;
        }

        // set selected status
        this.permissions[item.index].setSelectedStatus(value);

        // check permission group head
        if (item.isParent && data.length > 0)
        {
            _.forEach(_.filter(data, (i) => !i.isParent), (permission) => 
            {
                (this.fc.perms as FormArray).at(permission.index)[value ? 'enable' : 'disable']();

                if (!value)
                {
                    (this.fc.perms as FormArray).at(permission.index).patchValue(false);

                    this.permissions[permission.index].setSelectedStatus(false);
                }
            });
        }
    }

    /**
     * check if permission parent selected 
     *
     * @param {Permission[]} data
     * @param {number} index
     * @returns {boolean}
     */
    checkCheckboxStatus(data: Permission[], index: number): boolean
    {
        if (this.editMode)
        {
            return !data[index].isParent && data.filter(i => i.isSelected === true).length < 1;
        }
        else
        {
            return !data[index].isParent;
        }
    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e)
        {
            e.preventDefault();

            this.permissions = [];
        }

        this.roleForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.permissionFormStatus = '';
        this.allChecked = false;
        this.indeterminate = false;

        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 50);
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.roleForm.invalid || this.permissions.length < 1) 
        {
            return;
        }

        const selectedPermissionIds = this.roleForm.getRawValue().perms
            .map((v: any, i: string | number) => v ? this.permissions[i] : null)
            .filter((v: Permission) => v !== null && v.isSelected)
            .map((v: Permission) => v.id);
        
        const dataObj = {
            name: _.trim(this.fc.name.value).replace(/\s+/g, '-').toLowerCase(),
            display: this.fc.display.value,
            desc: this.fc.desc.value,
            color: this.colorCode,
            level: this.fc.level.value,
            has_admin_privileges: this.fc.admin_privileges.value,
            org: '',
            selectedPerms: selectedPermissionIds
        };

        if (this.editMode)
        {
            dataObj['id'] = this._data.response.role.id;
        }

        this._logger.debug('[role object]', dataObj);

        this.buttonLoader = true;

        this._roleService[this.editMode ? 'updateRole' : 'storeRole'](dataObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res =>
                {
                    this.buttonLoader = false;

                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res), 250);
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

    /**
     * update view scroll on tab collapsed
     *
     * @param {boolean} value
     */
    onPermissionTabCollapsed(value: boolean): void
    {
        setTimeout(() => this.directiveScroll.update(true));
    }

}

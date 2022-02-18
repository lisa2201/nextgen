import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import { fadeMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { PermissionService } from 'app/main/modules/permission/services/permission.service';

import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { Permission } from 'app/main/modules/permission/permission.model';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'update-organization-permissions',
    templateUrl: './update-organization-permissions.component.html',
    styleUrls: ['./update-organization-permissions.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class UpdateOrganizationPermissionsComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    permissionForm: FormGroup;
    buttonLoader: boolean;

    permissions: Permission[];
    selectedPermissions: any;
    permissionFormStatus: string;
    hasPermissionData: boolean;
    allChecked: boolean;
    indeterminate: boolean;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        public matDialogRef: MatDialogRef<UpdateOrganizationPermissionsComponent>,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _permService: PermissionService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.dialogTitle = `Edit ${this._data.type === AppConst.roleLevel.OWNER ? 'Subscriber' : 'Emergency Contact'} Permissions`;
        this.buttonLoader = false;

        this.permissions = this._data.resource.perms;
        this.selectedPermissions = this._data.selected.map((i: Permission)  => i.id);
        this.allChecked = false;
        this.indeterminate = false;
        this.permissionFormStatus = '';

        this.permissionForm = this.createForm();

        this.addCheckboxes();

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
        this._logger.debug('update site-manager permissions !!!', this._data);

        this.onChanges();
    }

    onChanges(): void
    {
        // Subscribe to form value changes
        this.permissionForm
            .get('perms')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.updateSingleChecked());

        // initial check
        this.updateSingleChecked();
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
        return this.permissionForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            perms: new FormArray([], minSelectedCheckboxes()),
        });
    }

    /**
     * add permission checkboxes
     */
    addCheckboxes(): void
    {
        this.permissions.map((o, i) => 
        {
            const control = new FormControl(_.indexOf(this.selectedPermissions, o.id) > -1);
            (this.fc.perms as FormArray).push(control);

            // set selected on edit mode
            o.setSelectedStatus(_.indexOf(this.selectedPermissions, o.id) > -1);
        });
    }

    /**
     * check if role selection has error
     */
    hasPermissionFormError(): void
    {
        this.permissionFormStatus = (this.permissionForm.get('perms').hasError('required') && this.permissionForm.get('perms').touched) ? 'error' : '';
    }

    /**
     * update all role items
     */
    updateAllChecked(): void
    {
        this.indeterminate = false;

        this.fc.perms
            .patchValue(this.permissionForm.getRawValue().perms.map(() => this.allChecked));

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
        this.allChecked = this.fc.perms.value.every((i: boolean) => i === true);

        this.indeterminate = this.fc.perms.value.some((i: boolean) => i === true) && !this.allChecked;

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
        return !data[index].isParent && data.filter(i => i.isSelected === true).length < 1;
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

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.permissionForm.invalid) 
        {
            return;
        }

        const sendObj = {
            type: this._data.type,
            perms: this.permissionForm.getRawValue().perms
                .map((v: any, i: number) => v ? this.permissions[i] : null)
                .filter((v: Permission) => v !== null && v.isSelected)
                .map((v: Permission) => v.id)
        };


        this._logger.debug('[update [permissions]]', sendObj);

        this.buttonLoader = true;

        this._permService
            .updateUserPermissions(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response =>
                {
                    if (!response)
                    {
                        return;
                    }

                    setTimeout(() => this.matDialogRef.close(response), 250);
                },
                error =>
                {
                    throw error;
                }
            );
    }
}

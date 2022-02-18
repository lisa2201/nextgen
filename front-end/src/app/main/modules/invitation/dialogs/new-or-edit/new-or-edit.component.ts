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
    selector: 'invitation-new-or-edit',
    templateUrl: './new-or-edit.component.html',
    styleUrls: ['./new-or-edit.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InvitationAddOrEditDialogComponent implements OnInit, OnDestroy
{
    private _unsubscribeAll: Subject<any>;

    action: string;
    dialogTitle: string;
    
    invitationForm: FormGroup;
    
    isOwnerSetup: boolean;
    editMode: boolean;
    buttonLoader: boolean;

    branches: Branch[];
    roles: Role[];
    levels: any;
    siteManageSelected: boolean;

    allChecked: boolean;
    indeterminate: boolean;
    branchFormStatus: string;
    mapOfBranchRoles: { [key: string]: { roles: string[], type: string } } = {};

    selectedRoles: Role[];
    rolesFormStatus: string;

    rolesModal: NzModalRef;
    confirmModal: NzModalRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<InvitationAddOrEditDialogComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {InvitationService} _invitationService
     * @param {NzModalService} _modalService
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<InvitationAddOrEditDialogComponent>,
        private _logger: NGXLogger,
        private _invitationService: InvitationService,
        private _modalService: NzModalService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        this._logger.debug('[invitation data]', _data);

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.editMode = false;
        this.buttonLoader = false;
        this.allChecked = false;
        this.indeterminate = false;
        this.branchFormStatus = '';
        this.selectedRoles = [];
        this.rolesFormStatus = '';

        this.action = _data.action;
        this.isOwnerSetup = _data.has_owner_access;
        this.roles = _data.response.depends.roles;
        this.levels = _data.response.depends.levels;
        this.branches = _data.response.depends.branches;

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

        (!this.isOwnerSetup) 
            ? this.addBranchCheckboxes() 
            : this.addRolesCheckboxes('KM8-OA');

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

        if (this.editMode && !this.isOwnerSetup)
        {
            this.refreshBranchStatus();    
        }
    }

    onChanges(): void
    {
        if(this.isOwnerSetup)
        {
            this.invitationForm
                .get('roles')
                .valueChanges
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(() => this.hasRolesFormError());
        }
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.rolesModal)
        {
            this.rolesModal.close();    
        }

        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }

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
        const form = new FormGroup({
            email: new FormControl(this.editMode ? this._data.response.invitation.email : '', [Validators.required, Validators.email]),
        });

        (this.isOwnerSetup) 
            ? form.addControl('roles', new FormArray([], minSelectedCheckboxes())) 
            : form.addControl('branches', new FormArray([], minSelectedCheckboxes()))

        return form;
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

    /*-------------------------------------------------------------*/

    addBranchCheckboxes(): void
    {
        this.branches.map((o, i) => 
        {
            o.disabled = (this.editMode && (o.id in this.mapOfBranchRoles));

            const control = new FormControl(this.editMode ? (o.id in this.mapOfBranchRoles) : false);
            (this.fc.branches as FormArray).push(control);
        });
    }

    updateCheckbox(branch: Branch, event: any): void
    {
        event.preventDefault();

        event.srcElement.blur();

        // single check
        if (branch && branch.disabled)
        {
            this.confirmModal = this._modalService
                .confirm(
                    {
                        nzTitle: AppConst.dialogContent.DELETE.TITLE,
                        nzContent: AppConst.dialogContent.DELETE.BODY,
                        nzWrapClassName: 'vertical-center-modal',
                        nzOkText: 'Yes',
                        nzOkType: 'danger',
                        nzOnOk: () =>
                        {
                            // delete from map
                            delete this.mapOfBranchRoles[branch.id];

                            branch.setDisableStatus(false);
                        },
                        nzOnCancel: () =>
                        {
                            (this.fc.branches as FormArray)
                                .at(branch.index)
                                .patchValue(true, { emitEvent: false });

                            return;
                        }
                    }
                );
                
            this.confirmModal
                .afterClose
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(() => this.refreshBranchStatus());
        }
        else
        {
            this.refreshBranchStatus();
        }
    }

    checkAll(value: boolean): void
    {
        this.fc.branches
            .patchValue(this.fc.branches.value.map(() => this.allChecked), { emitEvent: false });

        if (!value) { this.resetBranchCheckboxSelection(); }

        this.refreshBranchStatus();
    }

    resetBranchCheckboxSelection(): void
    {
        this.branchFormStatus = '';
        this.allChecked = false;
        this.indeterminate = false;
        this.mapOfBranchRoles = {};

        this.branches.map(o =>
        {
            o.setDisableStatus(false);
        });
    }

    refreshBranchStatus(): void
    {
        // error message fix
        this.fc.branches.markAllAsTouched();

        const allChecked = this.fc.branches.value.every((value: boolean) => value === true);
        const allUnChecked = this.fc.branches.value.every((value: boolean) => value === false);

        this.allChecked = allChecked;
        this.indeterminate = !allChecked && !allUnChecked;

        // check validation
        this.hasBranchFormError();
    }

    hasBranchFormError(): void
    {
        this.branchFormStatus = (this.invitationForm.get('branches').hasError('required') && this.invitationForm.get('branches').touched) ? 'error' : '';
    }

    branchSelected(): boolean
    {
        return this.getSelectedBranches().filter((i) => !i.disabled).length > 0 && (!_.isEmpty(this.levels) && !_.isEmpty(this.branches));
    }

    getSelectedBranches(): Branch[]
    {
        return this.invitationForm
            .value
            .branches
            .map((v, i) => v ? this.branches[i] : null)
            .filter(v => v !== null);
    }

    /*-------------------------------------------------------------*/

    addRolesCheckboxes(value: string): void
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
            const control = new FormControl(this.editMode ? _.indexOf(this._data.response.invitation.assignRoles, o.id) > -1 : false);
            (this.fc.roles as FormArray).push(control);
        });
    }

    hasRolesFormError(): void
    {
        this.rolesFormStatus = (this.invitationForm.get('roles').hasError('required') && this.invitationForm.get('roles').touched) ? 'error' : '';
    }

    getSelectedRoles(): any
    {
        return this.invitationForm
            .getRawValue().roles
            .map((v, i) => v ? this.selectedRoles[i] : null)
            .filter(v => v !== null)
            .map(v => v.id)
    }

    /*-------------------------------------------------------------*/

    hasRolesSelected(item?: Branch): boolean
    {
        if(this.isOwnerSetup)
        {
            return true;
        }
        
        item = item || null;

        if (_.isNull(item))
        {
            return this.getSelectedBranches().filter(i => i.disabled).length !== 0
                && Object.keys(this.mapOfBranchRoles).length !== 0
                && !Object.keys(this.mapOfBranchRoles).every(key => this.mapOfBranchRoles[key].roles.length < 1)
                && !this.branchSelected()
                && (this.getSelectedBranches().filter(i => i.disabled).length === Object.keys(this.mapOfBranchRoles).length);
        }
        else
        {
            return (item.id in this.mapOfBranchRoles) && this.mapOfBranchRoles[item.id].roles.length > 0;
        }
    }

    showRoles(e: MouseEvent, branch: Branch, type?: string): void
    {
        e.preventDefault();

        this.rolesModal = this._modalService
            .create({
                nzTitle: 'Assign Roles',
                nzContent: InvitationSetRolesComponent,
                nzMaskClosable: false,
                nzComponentParams: {
                    roles: this.roles,
                    levels: this.levels,
                    type: type ? AppConst.modalActionTypes.EDIT : '',
                    editItem: type ? this.mapOfBranchRoles[branch.id] : {}
                },
                nzFooter: [
                    {
                        label: type ? 'UPDATE' : 'APPLY',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.invitationAddRolesForm.valid),
                        onClick: componentInstance =>
                        {
                            if (componentInstance.getValues().action === AppConst.modalActionTypes.EDIT)
                            {
                                this.mapOfBranchRoles[branch.id] = {
                                    roles: componentInstance.getValues().roles,
                                    type: componentInstance.getValues().type
                                };
                            }
                            else
                            {
                                const selectedBranches = this.getSelectedBranches().filter(v => !v.disabled);
    
                                if (!_.isEmpty(selectedBranches))
                                {
                                    _.forEach(selectedBranches, (b) =>
                                    {
                                        if (!(b.id in this.mapOfBranchRoles))
                                        {
                                            this.mapOfBranchRoles[b.id] = {
                                                roles: componentInstance.getValues().roles,
                                                type: componentInstance.getValues().type
                                            };
        
                                            b.setDisableStatus(true);
                                        }
                                    });
                                }
                            }

                            this.rolesModal.destroy();
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.rolesModal.destroy()
                    }
                ]
            });
    }

    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.invitationForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.resetBranchCheckboxSelection();
    }

    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.invitationForm.invalid || !this.hasRolesSelected()) 
        {
            return;
        }

        const data = {
            email: this.fc.email.value,
            type: this.isOwnerSetup ? '1' : '0',
            role_map: !this.isOwnerSetup ? this.mapOfBranchRoles : this.getSelectedRoles(),
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

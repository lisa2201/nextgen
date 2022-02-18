import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { PermissionService } from '../../services/permission.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';

@Component({
    selector: 'update-permission-groups',
    templateUrl: './update-permission-groups.component.html',
    styleUrls: ['./update-permission-groups.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class UpdatePermissionGroupsComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    @Input() updates: any;

    migrationFiles: FormArray;
    permissionForm: FormGroup;

    permissionFormStatus: string;
    allChecked: boolean;
    indeterminate: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _permsService: PermissionService
    )
    {
        // set default values
        this.permissionFormStatus = '';
        this.allChecked = false;
        this.indeterminate = false;

        this.permissionForm = this.createForm();

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
        this._logger.debug('update permission groups !!!', this.updates);
        
        this.addCheckbox();
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

    createForm(): FormGroup
    {
        return new FormGroup({
            migrationFiles: new FormArray([], minSelectedCheckboxes())
        });
    }

    addCheckbox(): void
    {
        this.updates.map((o: any, i: any) => 
        {
            const control = new FormControl(false);
            (this.fc.migrationFiles as FormArray).push(control);
        });
    }

    /**
     * check if role selection has error
     */
    hasPermissionFormError(): void
    {
        this.permissionFormStatus = (this.permissionForm.get('migrationFiles').hasError('required') && this.permissionForm.get('migrationFiles').touched) ? 'error' : '';
    }

    /**
     * update all role items
     */
    updateAllChecked(): void
    {
        this.indeterminate = false;

        this.fc.migrationFiles
            .patchValue(this.fc.migrationFiles.value.map(() => this.allChecked), { emitEvent: false });

        this.hasPermissionFormError();
    }

    /**
     * update single role item
     */
    updateSingleChecked(): void
    {
        this.allChecked = this.fc.migrationFiles.value.every(i => i === true);

        this.indeterminate = this.fc.migrationFiles.value.some(i => i === true) && !this.allChecked;

        this.hasPermissionFormError();
    }

    /**
     * update permissions
     *
     * @returns {Promise<any>}
     */
    update(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            const selected = this.fc.migrationFiles.value
                .map((v: any, i: string | number) => v ? this.updates[i] : null)
                .filter((v: any) => v !== null);

            this._logger.debug('[update permission groups]', selected);

            this._permsService
                .updatePermissionGroups({ files: selected })
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    message =>
                    {
                        this._permsService.onUpdateSuccess.next(true);
                        
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                        resolve();
                    },
                    errorRes => 
                    {
                        setTimeout(() => this._notification.displaySnackBar(errorRes.error.message, NotifyType.ERROR), 200);
                        
                        reject(errorRes);
                    }
                );
        });
    }
}

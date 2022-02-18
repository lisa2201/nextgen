import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef, Inject } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { Branch } from 'app/main/modules/branch/branch.model';
import { Subject } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { CommonService } from 'app/shared/service/common.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { valueExists } from 'app/shared/validators/asynValidator';
import { Role } from 'app/main/modules/role/role.model';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import * as _ from 'lodash';
import { finalize } from 'rxjs/internal/operators/finalize';
import { ImportStaffService } from '../../service/staff-import.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'import-staff-dialog',
    templateUrl: './import-staff-dialog.component.html',
    styleUrls: ['./import-staff-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImportStaffDialogComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    organizations: Organization[];
    branches: Branch[];
    userForm: FormGroup;
    roleList: Role[];
    roleListForOrg: Role[];
    buttonLoader: boolean;
    constructor(
        public matDialogRef: MatDialogRef<ImportStaffDialogComponent>,
        private _logger: NGXLogger,
        private _notificationService: NotificationService,
        private _commonService: CommonService,
        private _cd: ChangeDetectorRef,
        private _staffImportService: ImportStaffService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._logger.debug('[staff data]', _data);
        this.buttonLoader = false;
        this.organizations = _data.org;
        this.roleList = _data.roles
        this.roleListForOrg = []

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.userForm = this.createBranchForm();

    }


    ngOnInit() {

        this.onChanges();
    }

    onChanges(): void {
        // Subscribe to form value changes
        this.userForm
            .get('org')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(val => {
                this.userForm.get('branch').patchValue(null);
                this.userForm.get('role').patchValue(null);

                this.branches = this.getBranches(val);
                this.roleListForOrg = this.getRoleList(val);
                console.log('roleListForOrg', this.roleListForOrg);
                
            }
            );
    }

    getBranches(value: string): any {
        return (value && !_.isEmpty(this.organizations.find(i => i.id === value))) ? this.organizations.find(i => i.id === value).branch : [];
    }

    getRoleList(value: string): Array<any> {
        return _.map(_.filter(this.roleList, (val) => val.orgId === value || val.orgId === null));
    }



    createBranchForm(): FormGroup {
        return new FormGroup({
            org: new FormControl(null, [Validators.required]),
            branch: new FormControl(null, [Validators.required]),
            role: new FormControl(null, [Validators.required]),
            table: new FormControl('', [Validators.required,Validators.pattern('^[a-zA-Z0-9_-]+$')]),
        });
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    resetForm(e: MouseEvent): void {
        if (e) { e.preventDefault(); }

        this.userForm.reset();

        for (const key in this.fc) {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }
    }

    get fc(): any {
        return this.userForm.controls;
    }

    onFormSubmit(e: MouseEvent): void {
        e.preventDefault();

        if (this.userForm.invalid) {
            return;
        }

        const sendObj = {
            table: this.fc.table.value,
            org: this.fc.org.value,
            branch: this.fc.branch.value,
            role: this.fc.role.value,
        };

        this._logger.debug('[branch object]', sendObj);

        this.buttonLoader = true;

        this._staffImportService
            .MigrateUserData(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                res =>
                {
                    this.resetForm(null);
                    // setTimeout(() => this._notificationService.displaySnackBar(res, NotifyType.SUCCESS), 200);

                    setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error =>
                {
                    this.buttonLoader = false;
                    // setTimeout(() => this._notificationService.displaySnackBar(error, NotifyType.ERROR), 200);
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }


}

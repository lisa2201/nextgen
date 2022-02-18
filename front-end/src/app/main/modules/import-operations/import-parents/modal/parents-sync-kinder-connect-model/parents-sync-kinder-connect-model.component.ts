import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Branch } from 'app/main/modules/branch/branch.model';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { RoomService } from 'app/main/modules/room/services/room.service';
import { User } from 'app/main/modules/user/user.model';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { valueExists } from 'app/shared/validators/asynValidator';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { ImportParentService } from '../../service/import-parent.service';

@Component({
  selector: 'parents-sync-kinder-connect-model',
  templateUrl: './parents-sync-kinder-connect-model.component.html',
  styleUrls: ['./parents-sync-kinder-connect-model.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentsSyncKinderConnectModelComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;

    form: FormGroup;
    buttonLoader = false;
    tableLoading: boolean;

    branches: Branch[];
    organizations: Organization[];
    

    /**
       * Constructor
       *
       * @param {MatDialogRef<NewOrEditComponent>} matDialogRef
       * @param {NGXLogger} _logger
       * @param {NotificationService} _notification
       * @param {RoomService} _roomService
       * @param _data
       */
    constructor(
        public matDialogRef: MatDialogRef<ParentsSyncKinderConnectModelComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _parentImportService: ImportParentService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {

        this._logger.debug('[user import kc data]', _data);
        this._unsubscribeAll = new Subject();
        this.organizations = _data.organizations? _data.organizations : [];
        this.form = this.createForm();
    }

    ngOnInit() {
        this._logger.debug('get import parents !!!', this.organizations);

        this.onChanges();
    }

    onChanges(): void {
        // Subscribe to form value changes
        this.form
            .get('org')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(val => {
                this.form.get('branch').patchValue(null);

                this.branches = this.getBranches(val);
                }
            );
    }

    getBranches(value: string): any
    {
        return (value && !_.isEmpty(this.organizations.find(i => i.id === value))) ? this.organizations.find(i => i.id === value).branch : [];
    }

    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

  createForm(): FormGroup
    {
        return new FormGroup({
            org: new FormControl(null, [Validators.required]),
            branch: new FormControl(null, [Validators.required]),
            // tableRef: new FormControl('', [Validators.required,Validators.pattern('^[a-zA-Z0-9_-]+$')]),
        });
    }

    get fc(): any 
    { 
        return this.form.controls; 
    }

    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.form.invalid) 
        {
            return;
        }

        const sendObj = {
            org: this.fc.org.value,
            branch: this.fc.branch.value,
            // tableRef: this.fc.tableRef.value,
        };

        this._logger.debug('[child object]', sendObj);

        this.buttonLoader = true;

        this._parentImportService
            .syncUser(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res =>
                {
                    this.buttonLoader = false;
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

    trackByFn(index: number, item: any): number
    {
        return index;
    }

}

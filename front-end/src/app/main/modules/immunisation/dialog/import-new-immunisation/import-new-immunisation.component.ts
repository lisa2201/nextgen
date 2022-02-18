import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ParentChildService } from 'app/main/modules/parent-child/service/parent-child.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { helpMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { AppConst } from 'app/shared/AppConst';
import { ImmunisationService } from '../../service/immunisation.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import * as _ from 'lodash';
import { AuthService } from 'app/shared/service/auth.service';
import { Branch } from 'app/main/modules/branch/branch.model';
import { Organization } from 'app/main/modules/organization/Models/organization.model';
@Component({
  selector: 'app-import-new-immunisation',
  templateUrl: './import-new-immunisation.component.html',
  styleUrls: ['./import-new-immunisation.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 }),
    ],
})
export class ImportNewImmunisationComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    buttonLoader: boolean;
    immunisationForm: FormGroup;
    isOwnerView: boolean;
    branches: Branch[];
    organization: Organization[];
    selectedOrg: Organization[];


  constructor(
    @Inject(MAT_DIALOG_DATA) private _data: any,
    public matDialogRef: MatDialogRef<ImportNewImmunisationComponent>,
    private _logger: NGXLogger,
    private _notification: NotificationService,
    private _immunisationService: ImmunisationService,
    private _authService: AuthService,

  ) 
  { 
        this._unsubscribeAll = new Subject();
        this.dialogTitle = 'Import Immunisation';
        this.organization = _data.organization[0];
        this.selectedOrg = [];
  }

  ngOnInit() {

        this.immunisationForm = this.createForm();

        this.immunisationForm
        .get('org')
        .valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll)
        )
        .subscribe(value =>
        {
            this.selectedOrg  = [];

            for(const id of value){
                this.selectedOrg.push(this.organization.find(v=> v.id === id))
            }
        });

  }


    createForm(): FormGroup
    {
        const form = new FormGroup({
            
            org: new FormControl(null, [Validators.required]),
        });

        return form;
    }


  resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.immunisationForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

    }

    get fc(): any 
    { 
        return this.immunisationForm.controls; 
    }


    trackByFn(index: number, item: any): number {
        return index;
    }


    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.immunisationForm.invalid) 
        {
            return;
        }
        const sendObj = {

            org: this.fc.org.value
        };

        this._logger.debug('[immunisation import object]', sendObj);

        this.buttonLoader = true;

        this._immunisationService
        .importImmunisation(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message =>
                {
                    this.buttonLoader = false;

                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(message), 250);
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


}

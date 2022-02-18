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
import { Immunisation } from '../../model/immunisation.model';
import { ImmunisationSchedule } from '../../model/immunisation-schedule.model';
import { AuthService } from 'app/shared/service/auth.service';
import { Branch } from 'app/main/modules/branch/branch.model';

export interface ImmunisationOption {
    name: string;
    value: string;
}

@Component({
  selector: 'app-new-immunisation',
  templateUrl: './new-immunisation.component.html',
  styleUrls: ['./new-immunisation.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 }),
    ],
})
export class NewImmunisationComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    buttonLoader: boolean;
    immunisationForm: FormGroup;
    scheduleArray: FormArray;
    immunisationOption: ImmunisationOption[];
    isEdit: boolean;
    buttonValue: string;
    immunisation: Immunisation;
    isOwnerView: boolean;
    branches: Branch[];


  constructor(
    @Inject(MAT_DIALOG_DATA) private _data: any,
    public matDialogRef: MatDialogRef<NewImmunisationComponent>,
    private _logger: NGXLogger,
    private _notification: NotificationService,
    private _immunisationService: ImmunisationService,
    private _authService: AuthService,

  ) 
  { 

      this._unsubscribeAll = new Subject();
      this.immunisationOption = AppConst.ImmunisationOption;
      
      if (_data.action === AppConst.modalActionTypes.NEW) {
          this.dialogTitle = 'New Immunisation';
          this.buttonValue = 'Save';
          this.isEdit = false;

      }
      if (_data.action === AppConst.modalActionTypes.EDIT) {
          this.dialogTitle = 'Edit Immunisation';
          this.buttonValue = 'Update';
          this.isEdit = true;
          this.immunisation = _data.item;
      }

      this.isOwnerView = this._authService.isOwner() || this._authService.getUserLevel() === AppConst.roleLevel.ROOT;
      this.branches = _data.branch;


  }

  ngOnInit() {

      this.immunisationForm = this.createForm();

      if (this.isEdit) {

          this.createScheduleResult();
      }

  }


    createForm(): FormGroup
    {
        const form = new FormGroup({
            name: new FormControl(this.isEdit ? this.immunisation.name : '', [Validators.required, Validators.pattern('^[a-zA-Z 0-9_)(-]+$'), Validators.maxLength(150)]),
            desc: new FormControl(this.isEdit ? this.immunisation.desc : '', [Validators.maxLength(500)]),
            status: new FormControl(this.isEdit ? (this.immunisation.status === true ? '1' : '0') : '1', [Validators.required]),
            scheduleArray: new FormArray(this.isEdit ? [] : [this.createSchedule()]),
            branches: new FormControl(null, this.isOwnerView && !this.isEdit ? [Validators.required] : []),
        });

        if(this.isOwnerView || !this.isEdit){

            form.addControl('branches', new FormControl(null, [Validators.required]))
        }
        return form;
    }

    createScheduleResult(): void {

        this.scheduleArray = this.immunisationForm.get('scheduleArray') as FormArray;

        this.immunisation.schedule.forEach((v: ImmunisationSchedule, i: number) => {
            this.scheduleArray.push(
                new FormGroup({
                    number: new FormControl(v.number),
                    period: new FormControl(v.period, []),
                    id:  new FormControl(this.isEdit ? v.id : '', [])
                })
            );
        });

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

    addSchedule(): void {
        this.scheduleArray = this.immunisationForm.get('scheduleArray') as FormArray;
        this.scheduleArray.push(this.createSchedule());
    }


    deleteSchedule(e: MouseEvent, index: number, dissable: boolean): void {

        !dissable ?  this.scheduleArray.removeAt(index) : '';
    }

    createSchedule(): FormGroup {
        return new FormGroup({
            number: new FormControl('', [Validators.required]),
            period: new FormControl('', [Validators.required]),
            id: new FormControl(null, []),
        });
    }

    isScheduleValid(): boolean {

        const array = this.immunisationForm.get('scheduleArray') as FormArray;
        return  array.valid ? true : false;
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
        const schedule = [];

        _.forEach(this.fc.scheduleArray.value, (i) => {
            schedule.push({
                number: i.number,
                period: i.period,
                id: this.isEdit ?  i.id : null
            });
        });

        this._logger.debug('[schedule]', schedule);
        this._logger.debug('[form]', this.fc.branches.value);

        const sendObj = {

            name: this.fc.name.value,
            desc: this.fc.desc.value,
            schedule: schedule,
            status: this.fc.status.value,
            branches: this.isOwnerView? this.fc.branches.value : null
        };

        if (this.isEdit) { sendObj['id'] = this.immunisation.id; }

        this._logger.debug('[immunisation object]', sendObj);

        this.buttonLoader = true;

        this._immunisationService[this.isEdit ? 'updateImmunisation' : 'storeImmunisation'](sendObj)
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

import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Child } from '../../child/child.model';
import { HealthAndMedical } from '../../child/health-medical/health-and-medical.model';
import { ParentChildService } from '../service/parent-child.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

@Component({
  selector: 'edit-child-info-dialog',
  templateUrl: './edit-child-info-dialog.component.html',
  styleUrls: ['./edit-child-info-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EditChildInfoDialogComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    childForm: FormGroup;
    healthMedicalForm: FormGroup;
    medicalData: HealthAndMedical;
    buttonLoader: boolean;
    child: Child;
    culturalrequirementschecked: boolean;
    religiousrequirementschecked: boolean;
    isHealth: boolean;
    aboriginals: any = [];

  constructor(
        @Inject(MAT_DIALOG_DATA) private _data: any,
        public matDialogRef: MatDialogRef<EditChildInfoDialogComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _ParentchildService: ParentChildService,
        private _commonService: CommonService,
        private _formBuilder: FormBuilder,
  ) 
  { 

    this._logger.debug('[child data]', _data);

        // Set the defaults
        this.child = _data.child
        this.buttonLoader = false;
        this.dialogTitle = 'Edit Profile';
        this.isHealth = _data.action;
        this.aboriginals = [
            'Aboriginal not TS Islander',
            'TS Islander not Aboriginal',
            'Aboriginal and TS Islander',
            'Not Aboriginal nor TS Islander',
            'Not stated'
          ];

        if(this.isHealth){

            this.medicalData  = this.child.healthAndMedical;
            this.healthMedicalForm = this.createMedicalForm();
            if(this.medicalData) {
                this.setValue();
            }
        }
        else{

            this.childForm = this.createChildForm();
            this.setCulturalFormValues();
        }
        
        

        
        // Set the private defaults
        this._unsubscribeAll = new Subject();

  }

  ngOnInit() {
  }


  createChildForm(): FormGroup
  {
      return new FormGroup({
          f_name: new FormControl(this.child.firstName, [Validators.required, Validators.pattern('^[a-zA-Z 0-9_)(-]+$'), Validators.maxLength(150)]),
          m_name: new FormControl(this.child.middleName? this.child.middleName: '', [Validators.maxLength(150), Validators.pattern('^[a-zA-Z 0-9_)(-]+$')]),
          l_name: new FormControl(this.child.lastName, [Validators.required, Validators.pattern('^[a-zA-Z 0-9_)(-]+$'), Validators.maxLength(150)]),
          legal_f_name: new FormControl(this.child.legalFirstName? this.child.legalFirstName : '', [Validators.maxLength(150)]),
          legal_l_name: new FormControl(this.child.legalLastName? this.child.legalLastName : '', [Validators.maxLength(150)]),
          crn: new FormControl(this.child.CRN? this.child.CRN : '', [Validators.maxLength(150)]),
          state: new FormControl(this.child.state? this.child.state : '', [Validators.maxLength(150)]),
          suburb: new FormControl(this.child.suburb? this.child.suburb : '', [Validators.maxLength(150)]),
          postalcode: new FormControl(this.child.postalCode? this.child.postalCode : '', [Validators.maxLength(150)]),

        ab_or_tsi: new FormControl(null),
        cultural_background: new FormControl(''),
        language: new FormControl(''),
        cultural_requirements: new FormControl(''),
        cultural_requirements_chk: new FormControl(''),
        religious_requirements_chk: new FormControl(''),
        religious_requirements: new FormControl(null),
      });
  }

    /**
  * set form values
  */
 setCulturalFormValues(): void {

    if(this.child.cultural.cultural_requirements_chk == '1'){
      this.culturalrequirementschecked = true;
    }

    if(this.child.cultural.religious_requirements_chk == '1'){
      this.religiousrequirementschecked = true;
    }

    this.childForm.get('ab_or_tsi').patchValue(this.child.cultural.ab_or_tsi, { emitEvent: false });
    this.childForm.get('cultural_background').patchValue(this.child.cultural.cultural_background, { emitEvent: false });
    this.childForm.get('language').patchValue(this.child.cultural.language, { emitEvent: false });
    this.childForm.get('language').patchValue(this.child.cultural.language, { emitEvent: false });
    this.childForm.get('cultural_requirements_chk').patchValue(this.culturalrequirementschecked, { emitEvent: false });
    this.childForm.get('cultural_requirements').patchValue(this.child.cultural.cultural_requirements, { emitEvent: false });
    this.childForm.get('religious_requirements_chk').patchValue(this.religiousrequirementschecked, { emitEvent: false });
    this.childForm.get('religious_requirements').patchValue(this.child.cultural.religious_requirements, { emitEvent: false });

  }

  createMedicalForm(): FormGroup {
    return new FormGroup({
      child_medical_number: new FormControl(''),
      disabledPastDates: new FormControl(''),
      child_medicalexpiry_date: new FormControl(''),
      ambulance_cover_no: new FormControl('', [Validators.maxLength(150)]),
      child_heallth_center: new FormControl('', [Validators.maxLength(150)]),
      practitioner_name: new FormControl('', [Validators.maxLength(150)]),
      practitioner_phoneNo: new FormControl('', [Validators.maxLength(150)]),
      practitioner_address: new FormControl('', [Validators.maxLength(150)]),
    });
  }

  setValue(): void {

    this.healthMedicalForm.get('child_medical_number').patchValue(this.medicalData.ref_no, { eventEmit: false });
    this.healthMedicalForm.get('child_medicalexpiry_date').patchValue(this.medicalData.medicare_expiry_date, { eventEmit: false });
    this.healthMedicalForm.get('ambulance_cover_no').patchValue(this.medicalData.ambulance_cover_no, { eventEmit: false });
    this.healthMedicalForm.get('child_heallth_center').patchValue(this.medicalData.health_center, { eventEmit: false });
    this.healthMedicalForm.get('practitioner_name').patchValue(this.medicalData.service_name, { eventEmit: false });
    this.healthMedicalForm.get('practitioner_phoneNo').patchValue(this.medicalData.service_phone_no, { eventEmit: false });
    this.healthMedicalForm.get('practitioner_address').patchValue(this.medicalData.service_address, { eventEmit: false });

  }

  
    /**
     * update view scroll on tab collapsed
     *
     * @param {boolean} value
     */
    onTabCollapsed(value: boolean): void
    {
        // update parent scroll
        this._commonService._updateParentScroll.next();
    }

  get fc(): any 
  { 
    if(this.isHealth){

        return this.healthMedicalForm.controls
    }
    else{
        return this.childForm.controls; 
    }
      
  }

  resetForm(e: MouseEvent, isMedical: boolean): void
  {
      if (e) { e.preventDefault(); }

      if(!isMedical){
        this.childForm.reset();
      }
      else{
          
          this.healthMedicalForm.reset();
      }

      for (const key in this.fc)
      {
          this.fc[key].markAsPristine();
          this.fc[key].updateValueAndValidity();
      }

  }
      /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent, isMedical: boolean): void
    {
        e.preventDefault();

        if (!isMedical) {

            if (this.childForm.invalid) {
                return;
            }

            const sendObj = {
                id: this.child.id,
                f_name: this.fc.f_name.value,
                m_name: this.fc.m_name.value,
                l_name: this.fc.l_name.value,
                legal_first_name: this.fc.legal_f_name.value,
                legal_last_name: this.fc.legal_l_name.value,
                crn: this.fc.crn.value,
                suburb: this.fc.suburb.value,
                state: this.fc.state.value,
                postalcode: this.fc.postalcode.value,
                cultural: {
                    id: this.child.cultural.id,
                    ab_or_tsi: this.fc.ab_or_tsi.value,
                    cultural_background: this.fc.cultural_background.value,
                    language: this.fc.language.value,
                    cultural_requirements_chk: this.fc.cultural_requirements_chk.value,
                    cultural_requirements: (this.fc.cultural_requirements_chk.value) ? this.fc.cultural_requirements.value : null,
                    religious_requirements_chk: this.fc.religious_requirements_chk.value,
                    religious_requirements: (this.fc.religious_requirements_chk.value) ? this.fc.religious_requirements.value : null
                }
            };

            this._logger.debug('[child object]', sendObj);

            this.buttonLoader = true;

            this._ParentchildService
                .updateChild(sendObj)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    res => {
                        this.buttonLoader = false;

                        this.resetForm(null, isMedical);

                        setTimeout(() => this.matDialogRef.close(res.message), 250);
                    },
                    error => {
                        this.buttonLoader = false;

                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
        }
        else {

            if (this.healthMedicalForm.invalid) {
                return;
            }

            const sendObj = {
                id: this.medicalData.id,
                childId: this.child.id,
                ref_no: this.fc.child_medical_number.value,
                medicare_expiry_date: this.fc.child_medicalexpiry_date.value,
                ambulance_cover_no: this.fc.ambulance_cover_no.value,
                health_center: this.fc.child_heallth_center.value,
                service_name: this.fc.practitioner_name.value,
                service_phone_no: this.fc.practitioner_phoneNo.value,
                service_address: this.fc.practitioner_address.value,
            };

            this._logger.debug('[child object]', sendObj);

            this.buttonLoader = true;

            this._ParentchildService
                .storeHealthMedical(sendObj)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    res => {
                        this.buttonLoader = false;

                        this.resetForm(null, isMedical);

                        setTimeout(() => this.matDialogRef.close(res.message), 250);
                    },
                    error => {
                        this.buttonLoader = false;

                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
        }
    }

    onCulturalRequirement(mode: boolean): void {
        if (mode == true) {
          this.culturalrequirementschecked = true;
        }
        else {
          this.culturalrequirementschecked = false;
          this.fc.cultural_requirements.value = null;
        }
      }
    
      onReligiousRequirementsChange(mode: boolean): void {
    
        if (mode == true) {
          this.religiousrequirementschecked = true;
        }
        else {
          this.religiousrequirementschecked = false;
          this.fc.religious_requirements.value = null;
        }
      }

      disabledPastDates = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) < 0;
      }
}



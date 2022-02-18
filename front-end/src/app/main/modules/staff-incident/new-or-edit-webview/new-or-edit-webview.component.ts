import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FuseConfigService } from '@fuse/services/config.service';
import { CommonModule } from "@angular/common";
import { fuseAnimations } from '@fuse/animations';
import { FormControl, FormGroup, Validators, FormArray, ValidatorFn } from '@angular/forms';
import { FileListItem } from 'app/shared/components/s3-upload/s3-upload.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { helpMotion } from 'ng-zorro-antd';
import { AppConst } from 'app/shared/AppConst';
import { CommonService } from 'app/shared/service/common.service';
import { User } from 'app/main/modules/user/user.model';
import { DateTimeHelper } from '../../../../utils/date-time.helper';

import { SignaturePad } from 'angular2-signaturepad';
import { StaffIncident } from '../staff-incident.model';
import { ActivatedRoute } from "@angular/router";

import { StaffIncidentService } from '../services/staff-incident.service';
import { StaffIncidentWebviewService } from '../services/staff-incident-webview.service';

@Component({
  selector: '.incident-new-or-edit-webview',
  templateUrl: './new-or-edit-webview.component.html',
  styleUrls: ['./new-or-edit-webview.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    helpMotion,
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 1000 }),
    fadeOutOnLeaveAnimation({ duration: 2000 })
  ]
})
export class NewOrEditWebviewComponent implements OnInit, OnDestroy {
  private _unsubscribeAll: Subject<any>;

  dialogTitle: string;
  editMode = false;
  incidentForm: FormGroup;
  staffList: User[];
  incident: any;
  buttonLoader = false;
  s3Bucket: string;
  s3Path: string;
  uploadFileMap: object;
  uploadTypes: string;
  formImages: string[];

  @ViewChild('sigpadRecorded') public signaturePadRecorded: SignaturePad;
  @ViewChild('sigpadWitness') public signaturePadWitness: SignaturePad;
  @ViewChild('sigpadSupervisor') public signaturePadSupervisor: SignaturePad;

  public signaturePadOptions = {
    'minWidth': 0.7,
    'maxWidth': 2.5,
    'canvasWidth': 300,
    'canvasHeight': 150
  };

  /**
   * Constructor
   *
   * @param {NGXLogger} _logger
   * @param {FuseConfigService} _fuseConfigService
   * @param {StaffIncidentService} _staffIncidentService
   * @param {StaffIncidentWebviewService} _staffIncidentWebviewService
   * @param {CommonService} _commonService
   */
  constructor(
    private _logger: NGXLogger,
    private _fuseConfigService: FuseConfigService,
    private _staffIncidentService: StaffIncidentService,
    private _staffIncidentWebviewService: StaffIncidentWebviewService,
    private _commonService: CommonService,
    private _route: ActivatedRoute
  ) {

    this._route.data.subscribe( data=> 
        this.editMode = (data.type === 'edit')? true:false
    );
    // Configure the layout
    this._fuseConfigService.config = {
      layout: {
          style: 'vertical-layout-2',
          navbar: {
              hidden: true
          },
          toolbar: {
              hidden: true
          },
          footer: {
              hidden: true
          },
          sidepanel: {
              hidden: true
          }
      }
    };

    this.uploadTypes = 'image/*';
    this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
    this.s3Path = AppConst.s3Paths.CHILD_Profile;
    this.uploadFileMap = {};

    this._unsubscribeAll = new Subject();
 
    this._staffIncidentService
      .getUsers(null)
      .pipe(
        takeUntil(this._unsubscribeAll)).subscribe((value) => {
        this.staffList = value;
      });

    if(this.editMode){
      this._staffIncidentWebviewService
      .onIncidentChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((incident: StaffIncident) =>
      {
          this._logger.debug('incident', incident);

          if (incident)
          {
            this.dialogTitle = 'Edit Incident Form';
            this.editMode = true;
            this.incident = incident;

            const images = [];
            for (let i = 0; i < this.incident.images.length; i += 3) {
              const chunk = this.incident.images.slice(i, i + 3);
              images.push(chunk);
            }
            this.formImages = images;
          }
      });
    }else{
      this.dialogTitle = 'New Incident Form';
    }
  
    this.createIncidentForm();

  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  ngAfterViewInit() {
    if (this.editMode) {
      this.signaturePadRecorded.fromDataURL((this.incident.recordedPersonSignature != '')? this.incident.recordedPersonSignature: null);
      this.signaturePadWitness.fromDataURL((this.incident.witnessSignature != '')? this.incident.witnessSignature: null);
      this.signaturePadSupervisor.fromDataURL((this.incident.supervisorSignature != '')? this.incident.supervisorSignature: null);
    }
  }

  get fc(): any {
    return this.incidentForm.controls;
  }

  createIncidentForm(): void {
    this.incidentForm = new FormGroup({
      staff: new FormControl(this.editMode ? this.incident.staff.id : '', [Validators.required]),
      incidentDate: new FormControl(this.editMode ? this.incident.date : null, [Validators.required]),
      incidentTime: new FormControl(this.editMode ? this.incident.time : null, [Validators.required]),

      recordedPerson: new FormControl(this.editMode ? this.incident.recordedPerson : null),
      recordedDate: new FormControl(this.editMode ? this.incident.recordedDate : null),
      recordedTime: new FormControl(this.editMode ? this.incident.recordedTime : null),

      witnessPerson: new FormControl(this.editMode ? this.incident.witnessPerson : null),

      incidentCircumstances: new FormControl(this.editMode ? this.incident.incidentCircumstances : null),
      incidentEquipments: new FormControl(this.editMode ? this.incident.incidentEquipments : null),
      incidentLocation: new FormControl(this.editMode ? this.incident.incidentLocation : null),
      incidentActionTaken: new FormControl(this.editMode ? this.incident.incidentActionTaken : null),

      notificationParent: new FormControl(this.editMode ? this.incident.notificationParent : null),
      notificationParentDate: new FormControl(this.editMode ? this.incident.notificationParentDate : null),
      notificationParentTime: new FormControl(this.editMode ? this.incident.notificationParentTime : null),
      notificationParentContacted: new FormControl(this.editMode ? this.incident.notificationParentContacted : false),
      notificationSupervisor: new FormControl(this.editMode ? this.incident.notificationSupervisor : null),
      notificationSupervisorDate: new FormControl(this.editMode ? this.incident.notificationSupervisorDate : null),
      notificationSupervisorTime: new FormControl(this.editMode ? this.incident.notificationSupervisorTime : null),
      notificationSupervisorContacted: new FormControl(this.editMode ? this.incident.notificationSupervisorContacted : false),
      notificationOfficer: new FormControl(this.editMode ? this.incident.notificationOfficer : null),
      notificationOfficerDate: new FormControl(this.editMode ? this.incident.notificationOfficerDate : null),
      notificationOfficerTime: new FormControl(this.editMode ? this.incident.notificationOfficerTime : null),
      notificationOfficerContacted: new FormControl(this.editMode ? this.incident.notificationOfficerContacted : false),
      notificationMedical: new FormControl(this.editMode ? this.incident.notificationMedical : null),
      notificationMedicalDate: new FormControl(this.editMode ? this.incident.notificationMedicalDate : null),
      notificationMedicalTime: new FormControl(this.editMode ? this.incident.notificationMedicalTime : null),
      notificationMedicalContacted: new FormControl(this.editMode ? this.incident.notificationMedicalContacted : false),
      transportedByAmbulance: new FormControl(this.editMode ? this.incident.transportedByAmbulance : false),
      excludedFromshifts: new FormControl(this.editMode ? this.incident.excludedFromshifts : false),
      notifiedToAuthorities: new FormControl(this.editMode ? this.incident.notifiedToAuthorities : false),
      recommendedLeave: new FormControl(this.editMode ? this.incident.recommendedLeave : null),

      medicalCertificateProvided: new FormControl(this.editMode ? this.incident.medicalCertificateProvided : false),
      medicalCertificateSubmitted: new FormControl(this.editMode ? this.incident.medicalCertificateSubmitted : false),

      supervisor: new FormControl(this.editMode ? this.incident.supervisor : null),
      supervisedDate: new FormControl(this.editMode ? this.incident.supervisedDate : null),
      supervisorComments: new FormControl(this.editMode ? this.incident.supervisorComments : null)
    });

  }

  resetForm(e: MouseEvent): void {
    if (e) { e.preventDefault(); }
    this.incidentForm.reset();

    this.clearSignature('all');

    for (const key in this.fc) {
      this.fc[key].markAsPristine();
      this.fc[key].updateValueAndValidity();
    }
  }

  handleUploadChange(fileList: FileListItem[], inputName: string): void {
    this.uploadFileMap[inputName] = _.map(fileList, 'key');
  }

  onFormSubmit(e: MouseEvent): void {

    e.preventDefault();

    if (this.incidentForm.invalid) {
      return;
    }

    const sendObj = {

      staff: this.fc.staff.value,
      date: (this.fc.incidentDate.value) ? DateTimeHelper.getUtcDate(this.fc.incidentDate.value) : DateTimeHelper.getUtcDate(new Date()),
      time: this.fc.incidentTime.value,

      recordedPerson: this.fc.recordedPerson.value,
      recordedPersonSignature: this.signaturePadRecorded.toDataURL('image/png', 0.5),
      recordedDate: (this.fc.recordedDate.value) ? DateTimeHelper.getUtcDate(this.fc.recordedDate.value) : null,
      recordedTime: this.fc.recordedTime.value,

      witnessPerson: this.fc.witnessPerson.value,
      witnessSignature: this.signaturePadWitness.toDataURL('image/png', 0.5),

      incidentCircumstances: this.fc.incidentCircumstances.value,
      incidentEquipments: this.fc.incidentEquipments.value,
      incidentLocation: this.fc.incidentLocation.value,
      incidentActionTaken: this.fc.incidentActionTaken.value,

      notificationParent: this.fc.notificationParent.value,
      notificationParentDate: (this.fc.notificationParentDate.value) ? DateTimeHelper.getUtcDate(this.fc.notificationParentDate.value) : null,
      notificationParentTime: this.fc.notificationParentTime.value,
      notificationParentContacted: (this.fc.notificationParentContacted.value) ? this.fc.notificationParentContacted.value : false,
      notificationSupervisor: this.fc.notificationSupervisor.value,
      notificationSupervisorDate: (this.fc.notificationSupervisorDate.value) ? DateTimeHelper.getUtcDate(this.fc.notificationSupervisorDate.value) : null,
      notificationSupervisorTime: this.fc.notificationSupervisorTime.value,
      notificationSupervisorContacted: (this.fc.notificationSupervisorContacted.value) ? this.fc.notificationSupervisorContacted.value : false,
      notificationOfficer: this.fc.notificationOfficer.value,
      notificationOfficerDate: (this.fc.notificationOfficerDate.value) ? DateTimeHelper.getUtcDate(this.fc.notificationOfficerDate.value) : null,
      notificationOfficerTime: this.fc.notificationOfficerTime.value,
      notificationOfficerContacted: (this.fc.notificationOfficerContacted.value) ? this.fc.notificationOfficerContacted.value : false,
      notificationMedical: this.fc.notificationMedical.value,
      notificationMedicalDate: (this.fc.notificationMedicalDate.value) ? DateTimeHelper.getUtcDate(this.fc.notificationMedicalDate.value) : null,
      notificationMedicalTime: this.fc.notificationMedicalTime.value,
      notificationMedicalContacted: (this.fc.notificationMedicalContacted.value) ? this.fc.notificationMedicalContacted.value : false,
      transportedByAmbulance: (this.fc.transportedByAmbulance.value) ? this.fc.transportedByAmbulance.value : false,
      excludedFromshifts: (this.fc.excludedFromshifts.value) ? this.fc.excludedFromshifts.value : false,
      notifiedToAuthorities: (this.fc.notifiedToAuthorities.value) ? this.fc.notifiedToAuthorities.value : false,
      recommendedLeave: this.fc.recommendedLeave.value,

      medicalCertificateProvided: (this.fc.medicalCertificateProvided.value) ? this.fc.medicalCertificateProvided.value : false,
      medicalCertificateSubmitted: (this.fc.medicalCertificateSubmitted.value) ? this.fc.medicalCertificateSubmitted.value : false,

      supervisor: this.fc.supervisor.value,
      supervisorSignature: this.signaturePadSupervisor.toDataURL('image/png', 0.5),
      supervisedDate: (this.fc.supervisedDate.value) ? DateTimeHelper.getUtcDate(this.fc.supervisedDate.value) : null,
      supervisorComments: this.fc.supervisorComments.value,
      upload_file: this.uploadFileMap,
    };

    if (this.editMode) { sendObj['id'] = this.incident.id; }

    this.buttonLoader = true;

    this._staffIncidentService[this.editMode ? 'updateIncident' : 'storeIncidnt'](sendObj)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        res => {
          this.buttonLoader = false;
          this.resetForm(null);
          setTimeout(() => alert('success'), 250);
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

  getIncidentImage(image: any): string {
    if (image) {
      return this._commonService.getS3FullLink(image);
    }
  }
  
  clearSignature(name): void {

    if(name == 'sigpadRecorded'){
      this.signaturePadRecorded.clear();
    }else if(name == 'sigpadWitness'){
      this.signaturePadWitness.clear();
    }else if(name == 'sigpadSupervisor'){
      this.signaturePadSupervisor.clear();
    }else if(name == 'all'){
      this.signaturePadRecorded.clear();
      this.signaturePadWitness.clear();
      this.signaturePadSupervisor.clear();
    }   
    
  }

}

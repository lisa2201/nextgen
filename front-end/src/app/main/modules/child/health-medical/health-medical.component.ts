import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { Router, ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { NotificationService } from 'app/shared/service/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { fadeMotion, NzModalService, slideMotion } from 'ng-zorro-antd';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { AppConst } from 'app/shared/AppConst';
import {takeUntil, debounceTime, distinctUntilChanged, finalize} from 'rxjs/operators';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Subject } from 'rxjs';
import { NewOrEditAllergyComponent } from './new-or-edit-allergy/new-or-edit-allergy.component';
import { HealthMedicalService } from './services/health-medical.service';
import { HealthMedical } from './health-medical.model';
import {FormControl, FormGroup, FormControlName, FormBuilder, Validators} from '@angular/forms';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { AllergyListViewComponent } from './list-view/list-view.component';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { HealthAndMedical } from './health-and-medical.model';
import {Child} from '../child.model';
import { ChildAddNewDocumentComponent } from '../documents/dialogs/child-add-new-document.component';

@Component({
  selector: 'child-health-medical',
  templateUrl: './health-medical.component.html',
  styleUrls: ['./health-medical.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fuseAnimations,
    fadeMotion,
    slideMotion,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 }),
    
  ]
})
export class HealthMedicalComponent implements OnInit {

    // Private
    private _unsubscribeAll: Subject<any>;
    // allergies: any;
    dialogRef: any;
    allergies: HealthMedical[];
    medicalData: HealthAndMedical;
    child: Child;
    panelOpenState: boolean = false;
    viewLoading: boolean;

  @ViewChild(AllergyListViewComponent)
  tableContentView: AllergyListViewComponent;

  @ViewChild(FusePerfectScrollbarDirective)
  directiveScroll: FusePerfectScrollbarDirective;
  healthMedicalForm: FormGroup;
  buttonLoader: boolean;
  buttonLoader1: boolean;

    /**
     * Constructor
     *
     * @param {Router} _router
     * @param {NGXLogger} _notification
     * @param {NGXLogger} _matDialog
     * @param {Router} _route
     * @param _commonService
     * @param _healthService
     * @param _formBuilder
     * @param _logger
     */
  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _notification: NotificationService,
    public _matDialog: MatDialog,
    private _commonService: CommonService,
    private _healthService: HealthMedicalService,
    private _formBuilder: FormBuilder,
    private _logger: NGXLogger,
  ) {
    // Set the private defaults
    this._unsubscribeAll = new Subject();

    this.healthMedicalForm = this.createForm();
    this.viewLoading = false;
    // this.medicalData = null;
  }

  ngOnInit(): void {

    this._healthService
      .onMedicalChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {

        this.medicalData = response;

      });

      this._healthService
          .onChildChanged
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((child: any) =>
          {
              this._logger.debug('[child medical - child]', child);

              this.child = child;

              if (this.medicalData != null) {
                this.setValue();
              }

          });


    


  }

  clickSwitch(e: MouseEvent, control: string): void
  {
    e.preventDefault();

    console.log(this.healthMedicalForm.get(control).value);
    
    

    //   if(!this.healthMedicalForm.get(control).value === true){

    //     return;
    //   }

      this.dialogRef = this._matDialog
          .open(ChildAddNewDocumentComponent,
              {
                  panelClass: 'child-add-new-document',
                  closeOnNavigation: true,
                  disableClose: true,
                  autoFocus: false,
                  data: {
                      action: AppConst.modalActionTypes.NEW,
                      response: {
                          childId : this._route.snapshot.params['id'],
                          isFromHealth: true,
                          value:control,
                          document: this.child.documents
                      }
                  },
                  width: '600px',
              });
              this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message =>
            {   
                if (!message )
                {
                    this.healthMedicalForm.get(control).patchValue(!this.healthMedicalForm.get(control).value? true: false, {eventEmit: false});
                    return;
                    
                }

                this.viewLoading = true;

                this._healthService.getChild(this.child.id);
                
                setTimeout(() => this.viewLoading = false, 1000);
            });
  }

  getStatus(control: string):boolean {

      return this.healthMedicalForm.get(control).value;
  }

  /**
     * Create health medical form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup {
        return this._formBuilder.group({
            child_medical_number: new FormControl(''),
            disabledPastDates: new FormControl(''),
            child_medicalexpiry_date: new FormControl(''),
            ambulance_cover_no: new FormControl('', [Validators.maxLength(150)]),
            child_heallth_center: new FormControl('', [Validators.maxLength(150)]),
            practitioner_name: new FormControl('', [Validators.maxLength(150)]),
            practitioner_phoneNo: new FormControl('', [Validators.maxLength(150)]),
            practitioner_address: new FormControl('', [Validators.maxLength(150)]),
            healthRecord: new FormControl(false, null),
            childImmunised: new FormControl(false, null),
            prescribedMedicine: new FormControl(false, null),
            anaphylaxis: new FormControl(false, null),
            epipenOrAnipen: new FormControl(false, null),
            healthConditions: new FormControl(false, null),
            asthma: new FormControl(false, null),
            birthCertificate: new FormControl(false, null),
        });
    }

    setValue(): void {

        this.healthMedicalForm.get('child_medical_number').patchValue(this.medicalData.ref_no, {eventEmit: false});
        this.healthMedicalForm.get('child_medicalexpiry_date').patchValue(this.medicalData.medicare_expiry_date, {eventEmit: false});
        this.healthMedicalForm.get('ambulance_cover_no').patchValue(this.medicalData.ambulance_cover_no, {eventEmit: false});
        this.healthMedicalForm.get('child_heallth_center').patchValue(this.medicalData.health_center, {eventEmit: false});
        this.healthMedicalForm.get('practitioner_name').patchValue(this.medicalData.service_name, {eventEmit: false});
        this.healthMedicalForm.get('practitioner_phoneNo').patchValue(this.medicalData.service_phone_no, {eventEmit: false});
        this.healthMedicalForm.get('practitioner_address').patchValue(this.medicalData.service_address, {eventEmit: false});
        this.healthMedicalForm.get('healthRecord').patchValue(this.child.documents.documents?.healthRecord !== undefined ? (this.child.documents.documents?.healthRecord.length > 0 ? true : false) : false, {eventEmit: false});
        this.healthMedicalForm.get('childImmunised').patchValue(this.child.documents.documents?.childImmunised!== undefined ? (this.child.documents.documents?.childImmunised.length > 0 ? true : false) : false, {eventEmit: false});
        this.healthMedicalForm.get('prescribedMedicine').patchValue(this.child.documents.documents?.prescribedMedicine!== undefined ? (this.child.documents.documents?.prescribedMedicine.length > 0 ? true : false) : false, {eventEmit: false});
        this.healthMedicalForm.get('anaphylaxis').patchValue(this.child.documents.documents?.anaphylaxis!== undefined ? (this.child.documents.documents?.anaphylaxis.length > 0 ? true : false) : false, {eventEmit: false});
        this.healthMedicalForm.get('epipenOrAnipen').patchValue(this.child.documents.documents?.epipenOrAnipen!== undefined ? (this.child.documents.documents?.epipenOrAnipen.length > 0 ? true : false) : false, {eventEmit: false});
        this.healthMedicalForm.get('healthConditions').patchValue(this.child.documents.documents?.healthConditions!== undefined ? (this.child.documents.documents?.healthConditions.length > 0 ? true : false) : false, {eventEmit: false});
        this.healthMedicalForm.get('asthma').patchValue(this.child.documents.documents?.asthma!== undefined ? (this.child.documents.documents?.asthma.length > 0 ? true : false) : false, {eventEmit: false});
        this.healthMedicalForm.get('birthCertificate').patchValue(this.child.documents.documents?.birthCertificate !== undefined ? (this.child.documents.documents?.birthCertificate.length > 0 ? true : false) : false, {eventEmit: false});

    }


  /**
    * Update content scroll
    */
  updateScroll(): void {
    this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
  }

  openChildDoc(e: MouseEvent): void {
    e.preventDefault();

    this._router.navigateByUrl(`manage-children/child/${this.child.id}/documents`);
  }
  /**
 * go back
 *
 * @param {MouseEvent} e
 */
  onBack(e: MouseEvent): void {
    e.preventDefault();

    this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  disabledPastDates = (current: Date): boolean => {
    return differenceInCalendarDays.default(current, new Date()) < 0;
  }
  /**
   * Add new allergy
   */
  /*addDialog(e: MouseEvent): void {
    e.preventDefault();

    this.dialogRef = this._matDialog
      .open(NewOrEditAllergyComponent,
        {
          panelClass: 'allergy-new-or-edit-dialog',
          closeOnNavigation: true,
          disableClose: true,
          autoFocus: false,
          data: {
            action: AppConst.modalActionTypes.NEW,
            response: {
              childId: this._route.snapshot.params['id']
            }
          }
        });

    this.dialogRef
      .afterClosed()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(message => {
        if (!message) {
          return;
        }

        this._notification.clearSnackBar();

        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
      });

  }*/


  addDialog(e: MouseEvent): void {

        e.preventDefault();
        this.buttonLoader1 = true;

        this._healthService
            .getAllergyTypes()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader1 = false, 200))
            )

            .subscribe(
                response => {
                    if (_.isEmpty(response.allergyTypes)) { return; }
                    this.dialogRef = this._matDialog
                        .open(NewOrEditAllergyComponent,
                            {
                                panelClass: 'allergy-new-or-edit-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.NEW,
                                    response: {
                                        allergyTypes: response.allergyTypes,
                                        childId: this._route.snapshot.params['id'],
                                    }
                                }
                            });

                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(message => {
                            if (!message) {
                                return;
                            }

                            this._notification.clearSnackBar();

                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                }
            );
}

  get fc(): any {
      return this.healthMedicalForm.controls;
  }

  onFormSubmit(e: MouseEvent): void
  {
      e.preventDefault();

      const sendObj = {
        
          id: this.medicalData.id,
          childId: this._route.snapshot.params['id'],
          ref_no: this.fc.child_medical_number.value,
          medicare_expiry_date: this.fc.child_medicalexpiry_date.value,
          ambulance_cover_no: this.fc.ambulance_cover_no.value,
          health_center: this.fc.child_heallth_center.value,
          service_name: this.fc.practitioner_name.value,
          service_phone_no: this.fc.practitioner_phoneNo.value,
          service_address: this.fc.practitioner_address.value,

      };

      this.buttonLoader = true;
      
      this._healthService
          .storeHealthMedical(sendObj)
          .pipe()
          .subscribe(
                message =>
                {
                    this.buttonLoader = false;
                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                  
                },
                error =>
                {
                    this.buttonLoader = false;

                    throw error;
                },
               
            );
    }

    getChildProfileImage(item) : string
    {
        if(item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }
}

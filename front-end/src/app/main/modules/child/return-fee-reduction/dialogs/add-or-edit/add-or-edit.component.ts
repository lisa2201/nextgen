import { Component, OnInit, Inject, ViewEncapsulation, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { helpMotion } from 'ng-zorro-antd';
import { AppConst } from 'app/shared/AppConst';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ReturnFeeReductionService } from '../../services/return-fee-reduction.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { subDays, differenceInCalendarDays } from 'date-fns';

@Component({
  selector: 'return-fee-add-or-edit',
  templateUrl: './add-or-edit.component.html',
  styleUrls: ['./add-or-edit.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    helpMotion,
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class AddOrEditComponent implements OnInit, OnDestroy {

  private _unsubscribeAll: Subject<any>;
  
  ReturnFeeReductionForm: FormGroup;
  action: string;
  dialogTitle: string;
  buttonLoader: boolean;
  item:any
  editMode: boolean;
  errorMsg: any;
  buttonAction: string;
  enrolmentData: any;

  /**
  * Constructor
  *
  * @param {MatDialogRef<BranchAddDialogComponent>} matDialogRef
  * @param _data
  */

  constructor(
    public matDialogRef: MatDialogRef<AddOrEditComponent>,
    public _returnFeeReductionService: ReturnFeeReductionService,
    @Inject(MAT_DIALOG_DATA) private _data: any

  ) {

    this.item = null;
    this.editMode = false;

    this.action = _data.action;
    if (this.action === AppConst.modalActionTypes.NEW) {
      this.dialogTitle = 'Create Return Fee Reduction ';
      this.buttonAction = 'Save';
    }
    else {

      this.item = this._data.response.item;
      this.editMode = true;
      this.dialogTitle = 'Edit Return Fee Reduction';
      this.errorMsg = this.item.error;
      this.buttonAction = 'Edit';

    }

    this.ReturnFeeReductionForm = this.createForm();
    this._unsubscribeAll = new Subject();

     this.enrolmentData = this._data.response.child.enrollments.find(
      (el: any) => {
        return el.status === 'CONFIR'
      }
    );

    console.log('enrolment data-->',this.enrolmentData);

  }

  ngOnInit(): void {

    if(this.item != null){
      this.setValues();
    }

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
  
  trackByFn(index: number, item: any): number
  {
      return index;
  }

  /**
   * Create compose form
   *
   * @returns {FormGroup}
   */
  createForm(): FormGroup {
    return new FormGroup({
      enrolmentID: new FormControl(this.enrolmentData ? this.enrolmentData['enrolId'] : '' , [Validators.required, Validators.maxLength(20)]),
      sessionReportStartDate: new FormControl('', [Validators.required]),
      totalFeeReductionAmountForWeek: new FormControl('', [Validators.required]),
      amountPassedOnToIndividual: new FormControl('', [Validators.required]),
      amountNotPassedOnToIndividual: new FormControl('', [Validators.required]),
      returnFeeReductionReason: new FormControl('', [Validators.required, Validators.maxLength(250)]),
    })
  }

  setValues(): void {
        this.ReturnFeeReductionForm.get('enrolmentID').patchValue(this.item.properties.enrolmentID, { emitEvent: false });
        this.ReturnFeeReductionForm.get('sessionReportStartDate').patchValue(this.item.properties.sessionReportStartDate, { emitEvent: false });
        this.ReturnFeeReductionForm.get('totalFeeReductionAmountForWeek').patchValue(this.item.properties.totalFeeReductionAmountForWeek, { emitEvent: false });
        this.ReturnFeeReductionForm.get('amountPassedOnToIndividual').patchValue(this.item.properties.amountPassedOnToIndividual, { emitEvent: false });
        this.ReturnFeeReductionForm.get('amountNotPassedOnToIndividual').patchValue(this.item.properties.amountNotPassedOnToIndividual, { emitEvent: false });
        this.ReturnFeeReductionForm.get('returnFeeReductionReason').patchValue(this.item.properties.returnFeeReductionReason, { emitEvent: false });
  }

  /**
   * convenience getter for easy access to form fields
   */
  get fc(): any {
    return this.ReturnFeeReductionForm.controls;
  }

  /**
   * Reset Form
   *
   */
  resetForm(e: MouseEvent): void {
    if (e) { e.preventDefault(); }

    this.ReturnFeeReductionForm.reset();

    for (const key in this.fc) {
      this.fc[key].markAsPristine();
      this.fc[key].updateValueAndValidity();
    }

  }

  /**
     * submit form
     *
     * @param {MouseEvent} e
     */
  onFormSubmit(e: MouseEvent): void {
    e.preventDefault();

    if (this.ReturnFeeReductionForm.invalid) {
      return;
    }

    const sendObj = {
      childId:this._data.response.child.id,
      enrolmentID: this.fc.enrolmentID.value,
      sessionReportStartDate: DateTimeHelper.getUtcDate(this.fc.sessionReportStartDate.value),
      totalFeeReductionAmountForWeek: this.fc.totalFeeReductionAmountForWeek.value,
      amountPassedOnToIndividual: this.fc.amountPassedOnToIndividual.value,
      amountNotPassedOnToIndividual: this.fc.amountNotPassedOnToIndividual.value,
      returnFeeReductionReason: this.fc.returnFeeReductionReason.value,
      
    };

    if (this.editMode) {
      sendObj['id'] = this.item.id;
  }

    this.buttonLoader = true;

    this._returnFeeReductionService[this.editMode ? 'updateReturnFee' : 'storeReturnFee'](sendObj)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(
        res => {
          this.buttonLoader = false;

          this.resetForm(null);

          setTimeout(() => this.matDialogRef.close(res.message), 250);
        },
        error => {
          this.buttonLoader = false;

          throw error;
        },
      );
  }

     /**
     * disable end date
     */
    disabledDates = (endValue: Date): boolean =>
    {
      return endValue.getDay() !== 1;
    }


}

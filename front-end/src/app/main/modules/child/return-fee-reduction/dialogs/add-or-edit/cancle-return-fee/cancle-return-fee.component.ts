import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AddOrEditComponent } from '../add-or-edit.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReturnFeeReductionService } from '../../../services/return-fee-reduction.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-cancle-return-fee',
  templateUrl: './cancle-return-fee.component.html',
  styleUrls: ['./cancle-return-fee.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    helpMotion,
    fuseAnimations,
    fadeInOnEnterAnimation({ duration: 300 }),
    fadeOutOnLeaveAnimation({ duration: 300 })
  ]
})
export class CancleReturnFeeComponent implements OnInit {

  ReturnFeeReductionCancleForm: FormGroup;
  dialogTitle: string;
  buttonLoader: boolean;

  private _unsubscribeAll: Subject<any>;
  errorMsg: any;

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

    this.ReturnFeeReductionCancleForm = this.createForm();
    this.dialogTitle = 'Cancel Return Fee Reduction ';
    this._unsubscribeAll = new Subject();

    this.errorMsg = (this._data.response.item.is_synced === '3' && this._data.response.item.error !== '') ? this._data.response.item.error : [];

  }

  ngOnInit(): void {
  }

  /**
   * Create form
   *
   * @returns {FormGroup}
   */
  createForm(): FormGroup {

    return new FormGroup({
      returnFeeReductionID: new FormControl(this._data.response.item.returnFeeReductionID, [Validators.required, Validators.maxLength(20)]),
      cancelReturnFeeReductionReason: new FormControl(this._data.response.item.cancelReturnFeeReductionReason, [Validators.required, Validators.maxLength(250)]),
    })
  }

  /**
   * convenience getter for easy access to form fields
   */
  get fc(): any {
    return this.ReturnFeeReductionCancleForm.controls;
  }

  /**
   * submit form
   *
   * @param {MouseEvent} e
   */
  onFormSubmit(e: MouseEvent): void {
    e.preventDefault();

    if (this.ReturnFeeReductionCancleForm.invalid) {
      return;
    }

    const sendObj = {
      // childId:this._data.response.child.id,
      returnFeeReductionID: this.fc.returnFeeReductionID.value,
      cancelReturnFeeReductionReason: this.fc.cancelReturnFeeReductionReason.value,
    };

    this.buttonLoader = true;

    this._returnFeeReductionService
      .cancelRturnFee(sendObj)
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
* Reset Form
*
*/
  resetForm(e: MouseEvent): void {
    if (e) { e.preventDefault(); }

    this.ReturnFeeReductionCancleForm.reset();

    for (const key in this.fc) {
      this.fc[key].markAsPristine();
      this.fc[key].updateValueAndValidity();
    }

  }

}

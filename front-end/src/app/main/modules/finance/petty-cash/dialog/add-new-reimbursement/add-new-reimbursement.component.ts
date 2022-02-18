import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { Category } from '../../model/category.model';
import { Reimbursement } from '../../model/reimbursements.model';
import { SupplierService } from '../../services/supplier.service';

@Component({
  selector: 'app-add-new-reimbursement',
  templateUrl: './add-new-reimbursement.component.html',
  styleUrls: ['./add-new-reimbursement.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AddNewReimbursementComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    form: FormGroup;
    buttonLoader: boolean;
    isEdit: boolean;
    reimbursement: Reimbursement;
    category: Category[];
    buttonVal: string;

    categoryType: typeof AppConst.PattrCashCategoryType;

    constructor(
        public matDialogRef: MatDialogRef<AddNewReimbursementComponent>,
        private _logger: NGXLogger,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _supplierService: SupplierService,
    ) {

        console.log(_data);
        

        // Set the private defaults
        this.isEdit = _data.action == AppConst.modalActionTypes.EDIT ? true : false;
        this.buttonLoader = false;
        this.dialogTitle = this.isEdit ? 'Edit Reimbursement':'Create New Reimbursement';
        this.buttonVal = this.isEdit? 'Update' : 'Save';
        this.category = _data.data.category
        this.categoryType = AppConst.PattrCashCategoryType;
        if(this.isEdit){
            this.reimbursement = _data.data.item;
        }
        this._unsubscribeAll = new Subject();
        this.form = this.createForm();

        if(this.isEdit && this.reimbursement.category.isDeleted) {
            this.form.get('category').disable();
        }
        else{
            this.category = this.category.filter(v=> !v.isDeleted);
        }


    }

  ngOnInit() {


  }

      /**
    * On destroy
    */
       ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

  getTotal(cost: string, gst: string):number{
      return parseInt(cost) + (parseInt(cost) * parseInt(gst)/100) ;
  }

  createForm(): FormGroup
  {
      return new FormGroup({
          category: new FormControl(this.isEdit? this.reimbursement.category.id: null, [Validators.required]),
          note: new FormControl(this.isEdit? this.reimbursement.note: '', [Validators.maxLength(500)]),
          total: new FormControl(this.isEdit? this.reimbursement.total: '', [Validators.required]),
          date: new FormControl(this.isEdit? this.reimbursement.date: '', [Validators.required]),
          
      });
  }

  resetForm(e: MouseEvent): void
  {
      if (e) { e.preventDefault(); }

      this.form.reset();

      for (const key in this.fc)
      {
          this.fc[key].markAsPristine();
          this.fc[key].updateValueAndValidity();
      }

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
          category: this.fc.category.value,
          date: this.fc.date.value,
          note: this.fc.note.value,
          total: this.fc.total.value

      };

      if(this.isEdit){
          sendObj['id'] = this.reimbursement.id
      }

      this._logger.debug('[receipt object]', sendObj);

      this.buttonLoader = true;

      if(this.isEdit){

          this._supplierService
          .updateReimbursement(sendObj)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(
              res =>
              {
                  this.buttonLoader = false;

                  this.resetForm(null);

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
      else{

          this._supplierService
          .storeReimbursement(sendObj)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(
              res =>
              {
                  this.buttonLoader = false;

                  this.resetForm(null);

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
      
  }

}

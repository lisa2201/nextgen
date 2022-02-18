import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { Category } from '../../model/category.model';
import { Receipt } from '../../model/receipt.model';
import { Supplier } from '../../model/supplier.model';
import { SupplierService } from '../../services/supplier.service';

@Component({
  selector: 'app-add-new-receipt',
  templateUrl: './add-new-receipt.component.html',
  styleUrls: ['./add-new-receipt.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AddNewReceiptComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    form: FormGroup;
    buttonLoader: boolean;
    isEdit: boolean;
    receipt: Receipt;
    supplier:Supplier[];
    category: Category[];
    buttonVal: string;

    categoryType: typeof AppConst.PattrCashCategoryType;

    constructor(
        public matDialogRef: MatDialogRef<AddNewReceiptComponent>,
        private _logger: NGXLogger,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _supplierService: SupplierService,
    ) {

        console.log(_data);
        // Set the private defaults
        this.isEdit = _data.action == AppConst.modalActionTypes.EDIT ? true : false;
        this.buttonLoader = false;
        this.dialogTitle = this.isEdit ? 'Edit Receipt':'Create New Receipt';
        this.buttonVal = this.isEdit? 'Update' : 'Save';
        this.supplier = _data.data.supplier;
        this.category = _data.data.category
        this.categoryType = AppConst.PattrCashCategoryType;
        if(this.isEdit){
            this.receipt = _data.data.item;
        }
        this._unsubscribeAll = new Subject();
        this.form = this.createForm();

        if(this.isEdit && this.receipt.category.isDeleted) {
            this.form.get('category').disable();
        }
        else{
            this.category = this.category.filter(v=> !v.isDeleted);
        }
        if(this.isEdit && this.receipt.supplier.isDeleted) {
            this.form.get('supplier').disable();
        }
        else{
            this.supplier = this.supplier.filter(v=> !v.isDeleted);
        }

        if(!this.isEdit){

            this.form.get('gst_amount').disable();
            this.form.get('gst').disable();
            this.form.get('total').disable();
        }

    }

    ngOnInit() {
        

        this.form.get('supplier').valueChanges
            .pipe(
                debounceTime(1000)
            )
            .subscribe((value) => {
                if (!_.isNull(value)){

                    this.form.get('gst').patchValue(this.supplier.find(v => v.id === value).gst, { emitEvent: false });
                    this.form.get('gst').enable();
                }
               
            });

        this.form.get('cost').valueChanges
            .pipe(
                debounceTime(1000)
            )
            .subscribe((value) => {

                if (!_.isNull(value)) {
                    if (this.form.get('supplier').value && this.form.get('gst').value) {

                        this.form.get('total').patchValue(this.getTotal(value, this.form.get('gst').value), { emitEvent: false });
                        this.form.get('gst_amount').patchValue(this.getGst(value, this.form.get('gst').value), { emitEvent: false });
                        this.form.get('total').enable();
                        this.form.get('gst_amount').enable();
                    }
                }
                else{
                    // this.form.get('total').patchValue(this.getTotal(value, this.form.get('gst').value), { emitEvent: false });
                    // this.form.get('gst_amount').patchValue(this.getGst(value, this.form.get('gst').value), { emitEvent: false });
                    this.form.get('total').disable();
                    this.form.get('gst_amount').disable();
                }
            });

            this.form.get('gst_amount').valueChanges
            .pipe(
                debounceTime(1000)
            )
            .subscribe((value) => {

                if (!_.isNull(value)) {

                        this.form.get('total').patchValue(parseFloat(value ? value : 0) + parseFloat(this.form.get('cost').value), { emitEvent: false });
                }

                else{

                    this.form.get('total').patchValue(parseFloat(this.form.get('cost').value), { emitEvent: false });
                }
            });

        this.form.get('gst').valueChanges
            .pipe(
                debounceTime(1000)
            )
            .subscribe((value) => {
                if (!_.isNull(value)) {
                if (this.form.get('supplier').value && this.form.get('cost').value) {
                    
                    
                    this.form.get('total').patchValue(this.getTotal(this.form.get('cost').value, value), { emitEvent: false });
                    this.form.get('gst_amount').patchValue(parseFloat(this.form.get('total').value)-parseFloat(this.form.get('cost').value), { emitEvent: false })
                    this.form.get('total').enable();
                }
            }

            });

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

      if(gst === null || gst === ''){
          return parseFloat(cost);
      }
      else{
        return parseFloat(cost) + (parseFloat(cost) * parseFloat(gst)/100) ;
      }
      
  }

  getGst(cost: string, gst: string):number{
      
    if(gst === null || gst === ''){
        return 0;
    }
    else{
      return (parseFloat(cost) * parseFloat(gst)/100) ;
    }
    
}

  createForm(): FormGroup
  {
      return new FormGroup({
          category: new FormControl(this.isEdit? this.receipt.category.id: null, [Validators.required]),
          supplier: new FormControl(this.isEdit? this.receipt.supplier.id: null, [Validators.required]),
          gst: new FormControl(this.isEdit? this.receipt.gst: '', [Validators.required,Validators.maxLength(150), Validators.pattern('[0-9_)(-]+$')]),
          note: new FormControl(this.isEdit? this.receipt.note: '', [Validators.maxLength(500)]),
          cost: new FormControl(this.isEdit? this.receipt.cost: '', [Validators.required, Validators.min(0)]),
          total: new FormControl(this.isEdit? this.receipt.total: '', [Validators.required]),
          date: new FormControl(this.isEdit? this.receipt.date: '', [Validators.required]),
          gst_amount: new FormControl(this.isEdit? this.receipt.gstAmount: '', [Validators.required]),
          
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
          supplier: this.fc.supplier.value,
          date: this.fc.date.value,
          note: this.fc.note.value,
          gst: this.fc.gst.value,
          cost: this.fc.cost.value,
          total: this.fc.total.value,
          gst_amount: this.fc.gst_amount.value,

      };

      if(this.isEdit){
          sendObj['id'] = this.receipt.id
      }

      this._logger.debug('[receipt object]', sendObj);

      this.buttonLoader = true;

      if(this.isEdit){

          this._supplierService
          .updateReceipt(sendObj)
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
          .storeReceipt(sendObj)
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

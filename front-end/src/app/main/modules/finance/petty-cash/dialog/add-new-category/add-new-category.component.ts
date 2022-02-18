import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Category } from '../../model/category.model';
import { CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-add-new-category',
  templateUrl: './add-new-category.component.html',
  styleUrls: ['./add-new-category.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AddNewCategoryComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    form: FormGroup;
    buttonLoader: boolean;
    isEdit: boolean;
    catergory: Category;
    categoryType: typeof AppConst.PattrCashCategoryType;
    buttonVal: string;

    constructor(
        public matDialogRef: MatDialogRef<AddNewCategoryComponent>,
        private _logger: NGXLogger,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _categoryService: CategoryService,
    ) {

        // Set the private defaults
        this.isEdit = _data.action == AppConst.modalActionTypes.EDIT ? true : false;
        this.buttonLoader = false;
        this.dialogTitle = this.isEdit ? 'Edit Category':'Create New Category';
        this.buttonVal = this.isEdit ? 'Update':'Save';
        this.categoryType = AppConst.PattrCashCategoryType;
        if(this.isEdit){
            this.catergory = _data.data;

        }
        this._unsubscribeAll = new Subject();
        this.form = this.createForm();


    }

  ngOnInit() {
      if(this.isEdit && this.catergory.isUsed) {
          this.form.get('type').disable();
      }
  }

  createForm(): FormGroup
  {
      return new FormGroup({
          name: new FormControl(this.isEdit? this.catergory.name: '', [Validators.required, Validators.maxLength(150)]),
          type: new FormControl(this.isEdit? this.catergory.type: null, [Validators.required]),
          
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
          name: this.fc.name.value,
          type: this.fc.type.value
      };

      if(this.isEdit){
          sendObj['id'] = this.catergory.id
      }

      this._logger.debug('[supllier object]', sendObj);

      this.buttonLoader = true;

      if(this.isEdit){

          this._categoryService
          .updateCategory(sendObj)
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

          this._categoryService
          .storeCategory(sendObj)
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

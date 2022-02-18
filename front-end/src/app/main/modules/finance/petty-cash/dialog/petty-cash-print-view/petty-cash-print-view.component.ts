import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupplierService } from '../../services/supplier.service';

@Component({
  selector: 'app-petty-cash-print-view',
  templateUrl: './petty-cash-print-view.component.html',
  styleUrls: ['./petty-cash-print-view.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PettyCashPrintViewComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    form: FormGroup;
    buttonLoader: boolean;
    downloadButton: boolean;

  constructor(
    public matDialogRef: MatDialogRef<PettyCashPrintViewComponent>,
    private _logger: NGXLogger,
    @Inject(MAT_DIALOG_DATA) private _data: any,
    private _supplierService: SupplierService,
  ) { 
    this.buttonLoader = false;
    this.downloadButton = false;
    this._unsubscribeAll = new Subject();
    this.form = this.createForm();
  }

  ngOnInit() {
  }

  createForm(): FormGroup
  {
      return new FormGroup({
          start_date: new FormControl('', [Validators.required]),
          end_date: new FormControl('', [Validators.required]),
          
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

  onFormSubmit(e: MouseEvent, isPdf:boolean): void
  {
      e.preventDefault();

      if (this.form.invalid) 
      {
          return;
      }

      const sendObj = {
          start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
          end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value)
      };


      this._logger.debug('[report object]', sendObj);

      isPdf? this.downloadButton = true : this.buttonLoader = true;

          this._supplierService
          .getReportPdf(sendObj, isPdf)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(
              res =>
              {
                  this.buttonLoader = false;
                  this.downloadButton = false;

                  this.resetForm(null);

                  setTimeout(() => this.matDialogRef.close(), 250);
              },
              error =>
              {
                  this.buttonLoader = false;
                  this.downloadButton = false;
                  throw error;
              },
              () =>
              {
                  this._logger.debug('😀 all good. 🍺');
              }
          );
      
  }
}

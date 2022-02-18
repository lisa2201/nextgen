import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppConst } from 'app/shared/AppConst';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Supplier } from '../../model/supplier.model';
import { SupplierService } from '../../services/supplier.service';

@Component({
    selector: 'add-new-supplier',
    templateUrl: './add-new-supplier.component.html',
    styleUrls: ['./add-new-supplier.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AddNewSupplierComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    form: FormGroup;
    buttonLoader: boolean;
    isEdit: boolean;
    supplier: Supplier;
    buttonVal: string;

    constructor(
        public matDialogRef: MatDialogRef<AddNewSupplierComponent>,
        private _logger: NGXLogger,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _supplierService: SupplierService,
    ) {

        // Set the private defaults
        this.isEdit = _data.action == AppConst.modalActionTypes.EDIT ? true : false;
        this.buttonLoader = false;
        this.dialogTitle = this.isEdit ? 'Edit Supplier':'Create New Supplier';
        this.buttonVal = this.isEdit ? 'Update':'Save';

        if(this.isEdit){
            this.supplier = _data.data;
        }
        this._unsubscribeAll = new Subject();
        this.form = this.createForm();


    }

    ngOnInit() {
    }

    createForm(): FormGroup
    {
        return new FormGroup({
            name: new FormControl(this.isEdit? this.supplier.name: '', [Validators.required, Validators.maxLength(150)]),
            gst: new FormControl(this.isEdit? this.supplier.gst: 10, [Validators.maxLength(150), Validators.pattern('[0-9_)(-]+$')]),
            address: new FormControl(this.isEdit? this.supplier.address: '', [Validators.maxLength(500)]),
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
            address: this.fc.address.value,
            gst: this.fc.gst.value,
        };

        if(this.isEdit){
            sendObj['id'] = this.supplier.id
        }

        this._logger.debug('[supllier object]', sendObj);

        this.buttonLoader = true;

        if(this.isEdit){

            this._supplierService
            .updateSupplier(sendObj)
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
            .storeSupplier(sendObj)
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


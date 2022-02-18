import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { helpMotion } from 'ng-zorro-antd';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ServiceSetupService } from '../../services/service-setup.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-service-setup-edit-financial',
    templateUrl: './service-setup-edit-financial.component.html',
    styleUrls: ['./service-setup-edit-financial.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]
})
export class ServiceSetupEditFinancialComponent implements OnInit {
   
    dialogRef: any;
    servicess: any;
    servicesetupForm: FormGroup;
    serviceid: string;
    index: number;
    _unsubscribeAll: any;
    action: any;
    permissionFormStatus: string;
    permissions: any[];
    dialogTitle: string;
    editMode: any;
    buttonLoading: boolean;
    financialData: any;
    buttonLoader: boolean;
    dateMode = 'time';
    contactData: any;


    constructor(

        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<ServiceSetupEditFinancialComponent>,
        private _servicesetupService: ServiceSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any

    ) {

        this.serviceid = _data.serviceid;
        this.index = _data.index;
        this.financialData = _data.financial_data;
        this.editMode = false;
        console.log('financial data', this.financialData);
        this.buttonLoader = false;
        this._logger.debug('[service data]', _data);

        this.permissionFormStatus = '';
        this.action = _data.action;
        this.permissions = [];


        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Financial';
            this.editMode = (_data.response && _data.response.provider);

        }
        else {
            this.dialogTitle = '';
        }

    }

      

    ngOnInit(): void {

        this.servicesetupForm = this.createServicesetupForm();

    }
    createServicesetupForm(): FormGroup {
        return new FormGroup({
            date: new FormControl(this.financialData.date, [Validators.required]),
            BSB: new FormControl(this.financialData.BSB, [Validators.required]),
            accountNumber: new FormControl(this.financialData.accountNumber, [Validators.required]),
            accountName: new FormControl(this.financialData.accountName, [Validators.required]),
          

        });

}

onFormSubmit(ev: MouseEvent): void {
    ev.preventDefault();

    if (!this.servicesetupForm.valid) {
        console.log(this.servicesetupForm.valid + 'form data not valid');
        return;
    }

   
    const sentdata = {
        date: DateTimeHelper.getUtcDate(this.servicesetupForm.get('date').value),
        BSB: this.servicesetupForm.get('BSB').value,
        accountNumber: this.servicesetupForm.get('accountNumber').value,
        accountName: this.servicesetupForm.get('accountName').value,
        serviceid: this.serviceid,
        index: this.index,


    };

    this.buttonLoading = true;


    this._logger.debug('[service data]', this._data);

    this._servicesetupService
        .updatefinancial(sentdata)
        .pipe(
            finalize(() => {
                this.buttonLoading = false;
            })
        )
        .subscribe((response) => {
            console.log(response);

            const obj = {
                response: response,


                data: {
                    date: this.servicesetupForm.get('date').value,
                    BSB: this.servicesetupForm.get('BSB').value,
                    accountNumber: this.servicesetupForm.get('accountNumber').value,
                    accountName: this.servicesetupForm.get('accountName').value,

                }
            };

            this.matDialogRef.close(obj);
        });

    }

    handleDateOpenChange(open: boolean): void {
        if (open) {
            this.dateMode = 'time';
        }
    }

    handleDatePanelChange(mode: string): void {
        console.log('handleDatePanelChange: ', mode);
    }
}



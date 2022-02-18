import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { helpMotion } from 'ng-zorro-antd';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { finalize } from 'rxjs/operators';
import { ServiceSetupService } from '../../services/service-setup.service';


@Component({
    selector: 'app-service-setup-edit-contact',
    templateUrl: './service-setup-edit-contact.component.html',
    styleUrls: ['./service-setup-edit-contact.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]
})
export class ServiceSetupEditContactComponent implements OnInit {

    dialogRef: any;
    servicess: any;
    servicesetupForm: FormGroup;
    states: any;
    serviceid: string;
    index: number;
    _unsubscribeAll: any;
    action: any;
    permissionFormStatus: string;
    permissions: any[];
    dialogTitle: string;
    editMode: any;
    buttonLoading: boolean;
    contactData: any;
    dateMode: string;
    addressData: any;



    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<ServiceSetupEditContactComponent>,
        private _servicesetupService: ServiceSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this.serviceid = _data.serviceid;
        this.index = _data.index;
        this.contactData = _data.contact_data;
        console.log(this.index);

        this.buttonLoading = false;

        this._logger.debug('[service data]', _data);



        // Set the defaults
        this.permissionFormStatus = '';
        this.action = _data.action;
        this.permissions = [];


        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Contact';
            this.editMode = (_data.response && _data.response.service);

        }
        else {
            this.dialogTitle = '';
        }

        this.servicesetupForm = this.createServicesetupForm();
    }


    ngOnInit(): void {

        this.servicesetupForm = this.createServicesetupForm();

    }
    createServicesetupForm(): FormGroup {
        return new FormGroup({
            // date: new FormControl(this.contactData.date, [Validators.required]),
            email: new FormControl(this.contactData.email, [Validators.required]),
            phone: new FormControl(this.contactData.phone, [Validators.required]),
            mobile: new FormControl(this.contactData.mobile, [Validators.required]),


        });
    }




    onFormSubmit(ev: MouseEvent): void {
        ev.preventDefault();

        if (!this.servicesetupForm.valid) {
            console.log(this.servicesetupForm.valid + 'form data not valid');
            return;
        }

        const sentdata = {

            // date: this.servicesetupForm.get('date').value,
            email: this.servicesetupForm.get('email').value,
            phone: this.servicesetupForm.get('phone').value,
            mobile: this.servicesetupForm.get('mobile').value,
            serviceid: this.serviceid,
            index: this.index,

        };


        this.buttonLoading = true;

        this._servicesetupService
            .updatecontact(sentdata)
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
                        // date: this.servicesetupForm.get('date').value,
                        email: this.servicesetupForm.get('email').value,
                        phone: this.servicesetupForm.get('phone').value,
                        mobile: this.servicesetupForm.get('mobile').value,

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

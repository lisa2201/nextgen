import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { helpMotion } from 'ng-zorro-antd';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ProviderSetupService } from '../../services/provider-setup.service';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-edit-contact',
    templateUrl: './edit-contact.component.html',
    styleUrls: ['./edit-contact.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]
})
export class EditContactComponent implements OnInit {

    dialogRef: any;
    providers: any;
    providerForm: FormGroup;
    states: any;
    providerid: string;
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


    constructor(

        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<EditContactComponent>,
        private _providerService: ProviderSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {

        this.providerid = _data.providerid;
        this.index = _data.index;
        this.contactData = _data.contact_data;
        console.log(this.index);

        this.buttonLoading = false;

        this._logger.debug('[provider data]', _data);



        // Set the defaults
        this.permissionFormStatus = '';
        this.action = _data.action;
        this.permissions = [];


        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Contact';
            this.editMode = (_data.response && _data.response.provider);

        }
        else {
            this.dialogTitle = '';
        }

        this.providerForm = this.createProviderForm();
    }



    ngOnInit(): void {


        this.providerForm = this.createProviderForm();
    }

    createProviderForm(): FormGroup {
        return new FormGroup({
            // date: new FormControl(this.contactData.date, [Validators.required]),
            email: new FormControl(this.contactData.email, [Validators.required]),
            phone: new FormControl(this.contactData.phone, [Validators.required]),
            mobile: new FormControl(this.contactData.mobile, [Validators.required]),


        });
    }
    onFormSubmit(ev: MouseEvent): void {
        ev.preventDefault();

        if (!this.providerForm.valid) {
            console.log(this.providerForm.valid + 'form data not valid');
            return;
        }

        const sentdata = {

            // date: this.providerForm.get('date').value,
            email: this.providerForm.get('email').value,
            phone: this.providerForm.get('phone').value,
            mobile: this.providerForm.get('mobile').value,
            providerid: this.providerid,
            index: this.index,

        };


        this.buttonLoading = true;

        this._providerService
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
                        // date: this.providerForm.get('date').value,
                        email: this.providerForm.get('email').value,
                        phone: this.providerForm.get('phone').value,
                        mobile: this.providerForm.get('mobile').value,
                        
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

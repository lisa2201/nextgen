import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { helpMotion } from 'ng-zorro-antd';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { finalize } from 'rxjs/operators';
import { ServiceSetupService } from '../../services/service-setup.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { formatDate } from '@angular/common';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-service-setup-edit-address',
    templateUrl: './service-setup-edit-address.component.html',
    styleUrls: ['./service-setup-edit-address.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]

})
export class ServiceSetupEditAddressComponent implements OnInit {


    dialogRef: any;
    services: any;
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
    isDisabledMode: boolean;
    type: string;
    addressData: any;

    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<ServiceSetupEditAddressComponent>,
        private _servicesetupService: ServiceSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {


        this.states = _data.states;
        this.serviceid = _data.serviceid;
        this.index = _data.index;
        this.addressData = _data.address_data;
        this.addressData.type === 'ZPOSTAL' ? this.type = 'Postal Address' : this.type = 'Physical';
        this.services = _data.serviceData;
        console.log(this.states);
        this.isDisabledMode = this.services.is_synced === '2' ? false : this.services.is_synced === '1' ? false : true;

        this.buttonLoading = false;

        this._logger.debug('[service data]', _data);



        // Set the defaults
        this.permissionFormStatus = '';
        this.action = _data.action;
        this.permissions = [];


        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Address';
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
            addresstype: new FormControl(this.isDisabledMode ? { value: this.type, disabled: true } : { value: this.type, disabled: true }, [Validators.required]),
            streetLine1: new FormControl(this.isDisabledMode ? { value: this.addressData.streetline1, disabled: true } : { value: this.addressData.streetline1, disabled: false }, [Validators.required]),
            streetLine2: new FormControl(this.isDisabledMode ? { value: this.addressData.streetline2, disabled: true } : { value: this.addressData.streetline2, disabled: false }, [Validators.required]),
            suburb: new FormControl(this.isDisabledMode ? { value: this.addressData.suburb, disabled: true } : { value: this.addressData.suburb, disabled: false }, [Validators.required]),
            state: new FormControl(this.isDisabledMode ? { value: this.addressData.state, disabled: true } : { value: this.addressData.state, disabled: false }, [Validators.required]),
            postalcode: new FormControl(this.isDisabledMode ? { value: this.addressData.postcode, disabled: true } : { value: this.addressData.postcode, disabled: false }, [Validators.required]),
            sdate: new FormControl(this.isDisabledMode ? { value: formatDate(new Date(), 'yyyy/MM/dd', 'en'), disabled: true } : { value: formatDate(new Date(), 'yyyy/MM/dd', 'en'), disabled: false }, [Validators.required]),
        });



    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(new Date(), current) > 0;
    }
    onFormSubmit(ev: MouseEvent): void {
        ev.preventDefault();

        if (!this.servicesetupForm.valid) {
            console.log(this.servicesetupForm.valid + 'form data not valid');
            return;
        }

        const sentdata = {

            type: this.servicesetupForm.get('addresstype').value,
            streetLine1: this.servicesetupForm.get('streetLine1').value,
            streetLine2: this.servicesetupForm.get('streetLine2').value,
            suburb: this.servicesetupForm.get('suburb').value,
            state: this.servicesetupForm.get('state').value,
            postcode: this.servicesetupForm.get('postalcode').value,
            serviceid: this.serviceid,
            index: this.index,
            sdate: DateTimeHelper.getUtcDate(this.servicesetupForm.get('sdate').value)

        };
        console.log('sentdata', sentdata);
        
        this.buttonLoading = true;

        this._servicesetupService
            .updateaddress(sentdata)
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
                        type: this.addressData.type,
                        streetLine1: this.servicesetupForm.get('streetLine1').value,
                        streetLine2: this.servicesetupForm.get('streetLine2').value,
                        suburb: this.servicesetupForm.get('suburb').value,
                        state: this.servicesetupForm.get('state').value,
                        postcode: this.servicesetupForm.get('postalcode').value,
                        startDate: DateTimeHelper.getUtcDate(this.servicesetupForm.get('sdate').value),
                        endDate: this.addressData.endDate
                    }
                };

                this.matDialogRef.close(obj);
            });

    }

    


}

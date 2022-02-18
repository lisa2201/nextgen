import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { helpMotion } from 'ng-zorro-antd';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ProviderSetupService } from '../../services/provider-setup.service';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { finalize } from 'rxjs/operators';
import { ProviderSetup } from '../../models/provider-setup.model';
import { formatDate } from '@angular/common';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-provider-edit-address',
    templateUrl: './provider-edit-address.component.html',
    styleUrls: ['./provider-edit-address.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]

})
export class ProviderEditAddressComponent implements OnInit {
    dialogRef: any;
    providerData: any;
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
    isDisabledMode: boolean;
    addressData: any;
    apiData: any;
    type: string;

    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<ProviderEditAddressComponent>,
        private _providerService: ProviderSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this.states = _data.states;
        // this.providerid = _data.providerid;
        this.index = _data.index;
        this.providerData = _data.providerData;
        this.addressData = _data.address_data;
        this.apiData = _data.apiData;
        this.addressData.type === 'ZPOSTAL' ? this.type = 'Postal Address' : this.type = 'Physical';
        this.isDisabledMode = this.providerData.is_synced === '2' ? false : this.providerData.is_synced === '1' ? false : true;
        // this.isDisabledMode = (this.providerData.is_synced === '0') ? true : (this.providerData.is_synced === '2') ?  false : true;
        console.log(this.states);

        this.buttonLoading = false;

        this._logger.debug('[provider data]', _data);



        // Set the defaults
        this.permissionFormStatus = '';
        this.action = _data.action;
        this.permissions = [];


        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Address';
            this.editMode = (_data.response && _data.response.provider);

        }
        else {
            this.dialogTitle = '';
        }

        this.providerForm = this.createProviderForm();
    }

    ngOnInit(): void {

        // this.providerForm = this.createProviderForm();
    }

    createProviderForm(): FormGroup {
        return new FormGroup({
            addresstype: new FormControl(this.isDisabledMode ? { value: this.type, disabled: true } : { value: this.type, disabled: true }, [Validators.required]),
            streetLine1: new FormControl(this.isDisabledMode ? { value: this.addressData.streetLine1, disabled: true } : { value: this.addressData.streetLine1, disabled: false }, [Validators.required]),
            streetLine2: new FormControl(this.isDisabledMode ? { value: this.addressData.streetLine2, disabled: true } : { value: this.addressData.streetLine2, disabled: false }, [Validators.required]),
            suburb: new FormControl(this.isDisabledMode ? { value: this.addressData.suburb, disabled: true } : { value: this.addressData.suburb, disabled: false }, [Validators.required]),
            state: new FormControl(this.isDisabledMode ? { value: this.addressData.state, disabled: true } : { value: this.addressData.state, disabled: false }, [Validators.required]),
            postalcode: new FormControl(this.isDisabledMode ? { value: this.addressData.postcode, disabled: true } : { value: this.addressData.postcode, disabled: false }, [Validators.required, Validators.maxLength(4)]),
            sdate: new FormControl(this.isDisabledMode ? { value: formatDate(new Date(), 'yyyy/MM/dd', 'en'), disabled: true } : { value: formatDate(new Date(), 'yyyy/MM/dd', 'en'), disabled: false }, [Validators.required]),
        });

    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(new Date(), current) > 0;
    }


    onFormSubmit(ev: MouseEvent): void {
        ev.preventDefault();

        if (!this.providerForm.valid) {
            console.log(this.providerForm.valid + 'form data not valid');
            return;
        }

        const sentdata = {

            type: this.providerForm.get('addresstype').value,
            streetLine1: this.providerForm.get('streetLine1').value,
            streetLine2: this.providerForm.get('streetLine2').value,
            suburb: this.providerForm.get('suburb').value,
            state: this.providerForm.get('state').value,
            postcode: this.providerForm.get('postalcode').value,
            providerid: this.providerData.id,
            index: this.index,
            sdate: DateTimeHelper.getUtcDate(this.providerForm.get('sdate').value)

        };
        console.log('address details', sentdata);
        

        this.buttonLoading = true;

        this._providerService
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
                        streetLine1: this.providerForm.get('streetLine1').value,
                        streetLine2: this.providerForm.get('streetLine2').value,
                        suburb: this.providerForm.get('suburb').value,
                        state: this.providerForm.get('state').value,
                        postcode: this.providerForm.get('postalcode').value,
                        startDate: DateTimeHelper.getUtcDate(this.providerForm.get('sdate').value),
                        endDate: this.addressData.endDate
                    }
                };

                console.log('object before close', obj);
                

                this.matDialogRef.close(obj);
            });

    }




}


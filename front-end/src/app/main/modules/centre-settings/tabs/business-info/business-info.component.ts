import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { helpMotion } from 'ng-zorro-antd';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import {finalize, takeUntil} from 'rxjs/operators';

import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { formatDate } from '@angular/common';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import {MustMatch} from '../../../../../shared/validators/matchInputs';
import {NotifyType} from '../../../../../shared/enum/notify-type.enum';
import {NotificationService} from '../../../../../shared/service/notification.service';
import {ServiceSetupService} from '../../../account-manager/service-setup/services/service-setup.service';
import {Subject} from 'rxjs';
import {AuthService} from '../../../../../shared/service/auth.service';
import {CenterSettingsService} from '../../center-settings/service/center-settings.service';

@Component({
    selector: 'center-settings-business-info',
    templateUrl: './business-info.component.html',
    styleUrls: ['./business-info.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]

})
export class BusinessInfoComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    dialogRef: any;
    action: string;
    dialogTitle: string;
    businessInfoForm: FormGroup;
    buttonLoading: boolean;
    serviceid: string;
    serviceData: any;
    branchDetails: any;
    centerSettings: any;

    businessName: string;
    businessDescription: string;
    address: string;
    email: string;
    phone: string;
    fax: string;
    zipCode: string;

    constructor(
        private _logger: NGXLogger,
        private _centerSettingsService: CenterSettingsService,
        private _notification: NotificationService,
        private _auth: AuthService,
    ) {

        this.dialogTitle = 'Credentials for Service ID';

        // this.servicesetupForm = this.createBusinessInfoForm();
    }

    ngOnInit(): void {
        this.businessInfoForm = this.createBusinessInfoForm();
        this.centerSettings = this._auth.getClient().centerSettings;
        this.branchDetails = this._auth.getClient();

        this.setValues();

    }

    createBusinessInfoForm(): FormGroup {
        return new FormGroup({
            businessName: new FormControl(this.businessName , [Validators.required]),
            businessDescription: new FormControl(null, []),
            address: new FormControl(null, []),
            email: new FormControl(null, [Validators.email]),
            phone: new FormControl(null, [Validators.pattern('^[0-9]*$')]),
            fax: new FormControl(null, [Validators.pattern('^[0-9]*$')]),
            zipCode: new FormControl(null, [Validators.pattern('^[0-9]*$')])
        });

    }


    setValues(): void {
        this.businessInfoForm.get('businessName').patchValue((this.centerSettings && this.centerSettings.business_name)? this.centerSettings.business_name : this.branchDetails.name);
        this.businessInfoForm.get('businessDescription').patchValue((this.centerSettings && this.centerSettings.business_description)? this.centerSettings.business_description : this.branchDetails.desc);
        this.businessInfoForm.get('address').patchValue((this.centerSettings && this.centerSettings.address)? this.centerSettings.address : this.branchDetails.addressLine1 + ' ' +  this.branchDetails.addressLine2);
        this.businessInfoForm.get('email').patchValue((this.centerSettings && this.centerSettings.email)? this.centerSettings.email : this.branchDetails.email);
        this.businessInfoForm.get('phone').patchValue((this.centerSettings && this.centerSettings.phone)? this.centerSettings.phone : this.branchDetails.phone);
        this.businessInfoForm.get('fax').patchValue((this.centerSettings && this.centerSettings.fax)? this.centerSettings.fax : this.branchDetails.fax);
        this.businessInfoForm.get('zipCode').patchValue((this.centerSettings && this.centerSettings.zip_code)? this.centerSettings.zip_code : this.branchDetails.zipcode);

    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(new Date(), current) > 0;
    }
    onFormSubmit(ev: MouseEvent): void {
        ev.preventDefault();

        if (!this.businessInfoForm.valid) {
            return;
        }

        const sentdata = {
            branch_id: this._auth.getClient().id,
            business_name: this.businessInfoForm.get('businessName').value,
            business_description: this.businessInfoForm.get('businessDescription').value,
            address: this.businessInfoForm.get('address').value,
            email: this.businessInfoForm.get('email').value,
            phone: this.businessInfoForm.get('phone').value,
            fax: this.businessInfoForm.get('fax').value,
            zip_code: this.businessInfoForm.get('zipCode').value,

        };
        this.buttonLoading = true;


        this._centerSettingsService.setBusinessInfo(sentdata)
            .subscribe(
                res => {
                    this.buttonLoading = false;
                    setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                },
                error => {
                    this.buttonLoading = false;
                    throw error;

                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    


}

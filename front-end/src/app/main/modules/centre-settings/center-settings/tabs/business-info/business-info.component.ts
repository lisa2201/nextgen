import { Component, OnInit, ViewEncapsulation, Inject, OnDestroy } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { CenterSettingsService } from '../../service/center-settings.service';
import { CommonService } from 'app/shared/service/common.service';

import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'center-settings-business-info',
    templateUrl: './business-info.component.html',
    styleUrls: ['./business-info.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]
})
export class BusinessInfoComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    dialogRef: any;
    action: string;
    dialogTitle: string;
    businessInfoForm: FormGroup;
    buttonLoading: boolean;
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

    globalDateFormats: Array<string>;
    globalTimeFormats: Array<string>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {CenterSettingsService} _centerSettingsService
     * @param {NotificationService} _notification
     * @param {AuthService} _auth
     */
    constructor(
        private _logger: NGXLogger,
        private _centerSettingsService: CenterSettingsService,
        private _notification: NotificationService,
        private _auth: AuthService,
        private _commonService: CommonService
    ) 
    {
        this.dialogTitle = 'Credentials for Service ID';
        this.centerSettings = this._auth.getClient().centerSettings;
        this.branchDetails = this._auth.getClient();
        this.globalDateFormats = this._commonService.getValidDateTimeFormats();
        this.globalTimeFormats = this._commonService.getValidDateTimeFormats('time');

        this.businessInfoForm = this.createBusinessInfoForm();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void 
    {
        this.setValues();
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number 
    {
        return index;
    }

    createBusinessInfoForm(): FormGroup 
    {
        return new FormGroup({
            businessName: new FormControl(this.businessName , [Validators.required]),
            businessDescription: new FormControl(null, []),
            address: new FormControl(null, []),
            email: new FormControl(null, [Validators.email]),
            phone: new FormControl(null, [Validators.pattern('^[0-9]*$')]),
            fax: new FormControl(null, [Validators.pattern('^[0-9]*$')]),
            zipCode: new FormControl(null, [Validators.pattern('^[0-9]*$')]),
            globalDateFormat: new FormControl('', [Validators.required]),
            globalTimeFormat: new FormControl('', [Validators.required]),
        });
    }

    setValues(): void 
    {
        this.businessInfoForm.get('businessName').patchValue((this.centerSettings && this.centerSettings.business_name)? this.centerSettings.business_name : this.branchDetails.name);
        this.businessInfoForm.get('businessDescription').patchValue((this.centerSettings && this.centerSettings.business_description)? this.centerSettings.business_description : this.branchDetails.desc);
        this.businessInfoForm.get('address').patchValue((this.centerSettings && this.centerSettings.address)? this.centerSettings.address : this.branchDetails.addressLine1 + ' ' +  this.branchDetails.addressLine2);
        this.businessInfoForm.get('email').patchValue((this.centerSettings && this.centerSettings.email)? this.centerSettings.email : this.branchDetails.email);
        this.businessInfoForm.get('phone').patchValue((this.centerSettings && this.centerSettings.phone)? this.centerSettings.phone : this.branchDetails.phone);
        this.businessInfoForm.get('fax').patchValue((this.centerSettings && this.centerSettings.fax)? this.centerSettings.fax : this.branchDetails.fax);
        this.businessInfoForm.get('zipCode').patchValue((this.centerSettings && this.centerSettings.zip_code)? this.centerSettings.zip_code : this.branchDetails.zipcode);
        this.businessInfoForm.get('globalDateFormat').patchValue((this.centerSettings && this.centerSettings.date_format) ? this.centerSettings.date_format : null);
        this.businessInfoForm.get('globalTimeFormat').patchValue((this.centerSettings && this.centerSettings.time_format) ? this.centerSettings.time_format : null);

        for (const key in this.businessInfoForm.controls)
        {
            this.businessInfoForm.controls[key].markAsTouched();
            this.businessInfoForm.controls[key].updateValueAndValidity();
        }
    }

    disabledDate = (current: Date): boolean => 
    {
        return differenceInCalendarDays.default(new Date(), current) > 0;
    }
    
    onFormSubmit(ev: MouseEvent): void 
    {
        ev.preventDefault();

        if (!this.businessInfoForm.valid) 
        {
            return;
        }

        const sentData = {
            branch_id: this._auth.getClient().id,
            business_name: this.businessInfoForm.get('businessName').value,
            business_description: this.businessInfoForm.get('businessDescription').value,
            address: this.businessInfoForm.get('address').value,
            email: this.businessInfoForm.get('email').value,
            phone: this.businessInfoForm.get('phone').value,
            fax: this.businessInfoForm.get('fax').value,
            zip_code: this.businessInfoForm.get('zipCode').value,
            date_format: this.businessInfoForm.get('globalDateFormat').value,
            time_format: this.businessInfoForm.get('globalTimeFormat').value,
        };

        this.buttonLoading = true;

        this._centerSettingsService
            .setBusinessInfo(sentData)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoading = false)
            )
            .subscribe(
                res => 
                {
                    this._auth.setClient(res.data);

                    setTimeout(() => this._notification.displaySnackBar(res.message, NotifyType.SUCCESS), 200);
                },
                error => 
                {
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }
}

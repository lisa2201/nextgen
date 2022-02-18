import { Component, OnInit, ViewEncapsulation, Inject, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ViewWaitlistComponent } from '../../waitlist-enrollment/list-view/dialogs/view-waitlist/view-waitlist.component';
import { AppConst } from 'app/shared/AppConst';
import { DebtService } from '../services/debt.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Subject } from 'rxjs/internal/Subject';
import * as _ from 'lodash';
import { ProviderSetup } from '../../account-manager/provider-setup/models/provider-setup.model';
import { NzUploadFile } from 'ng-zorro-antd';

@Component({
    selector: 'app-apa-new-or-edit',
    templateUrl: './apa-new-or-edit.component.html',
    styleUrls: ['./apa-new-or-edit.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ApaNewOrEditComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    action: any;
    dialogTitle: string;
    alternativePaymentArrangementFrom: FormGroup;
    buttonValue: string;
    editmode: boolean;

    buttonLoader: boolean;
    errorMsg: any;
    showUpload: boolean;
    fileList: File[] = [];

    arrangementType = [
        {
            value: 'P2P',
            description: 'Instalments'
        },
        {
            value: 'WHS',
            description: 'Withholdings'
        }
    ];

    supportingDoc = [
        {
            name: 'Debt evidence',
            index: 0,
            value: 'DBT001'
        }
    ];

    paymentPeriod = [
        {
            value: '2',
            description: '2 Months'
        },
        {
            value: '3',
            description: '3 Months'
        },
        {
            value: '4',
            description: '4 Months'
        },
        {
            value: '5',
            description: '5 Months'
        },
        {
            value: '6',
            description: '6 Months'
        },
    ];

    isReadonly: boolean;
    uploadmode: boolean;
    providers: ProviderSetup[];

    constructor(
        public matDialogRef: MatDialogRef<ViewWaitlistComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _debtService: DebtService
    ) {

        this._createForm();
        this.showUpload = false;

        this._unsubscribeAll = new Subject();

        this.action = _data.action;
        this.buttonLoader = false;

        this.isReadonly = false;
        this.uploadmode = false;
        this.errorMsg = null;
        this.editmode = false;
        this.providers = this._data.providers || [];

        if (this.action === AppConst.modalActionTypes.NEW) {

            this.dialogTitle = 'New Alternative Payment Arrangement';
            this.buttonValue = 'Save';
        } else if (this.action === 'EDIT-API') {

            if (this._data.response.item != '') {
                this.setAPIValues();
            }

            this.dialogTitle = 'Edit Alternative Payment Arrangement';
            this.buttonValue = 'Update';
            this.uploadmode = true;
            this.isReadonly = true;
            this.errorMsg = this._data?.response?.item?.error || null;

        } else {

            if (this._data.response.item != '') {
                this.setValues();
            }

            this.dialogTitle = 'Edit Alternative Payment Arrangement';
            this.buttonValue = 'Update';
            this.editmode = true;
            this.errorMsg = this._data.response.item.error;
        }
    }
    

    ngOnInit(): void {

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    resetForm(e: MouseEvent): void {
        if (e) { e.preventDefault(); }

        this.alternativePaymentArrangementFrom.reset();

        for (const key in this.fc) {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

    }

    /**
   * Create form
   *
   * @returns {FormGroup}
   */
    _createForm(): void {
        this.alternativePaymentArrangementFrom = new FormGroup({

            alternativePaymentArrangementID: new FormControl(''),
            providerID: new FormControl(''),
            paymentArrangementType: new FormControl(null),
            paymentArrangementStartDate: new FormControl(''),
            evenAmountsPaymentPeriod: new FormControl(null),
            offsettingArrangementServiceID: new FormControl(''),
            offsettingArrangementPercentage: new FormControl(''),
            supportingDocument: new FormControl(null)

        });
    }

    setValues(): void {

        this.alternativePaymentArrangementFrom.get('providerID').patchValue(this._data.response.item.provider.id, { emitEvent: false });
        // this.alternativePaymentArrangementFrom.get('alternativePaymentArrangementID').patchValue(this._data.response.item.alternativePaymentArrangementID, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('paymentArrangementType').patchValue(this._data.response.item.properties.paymentArrangementType, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('paymentArrangementStartDate').patchValue(this._data.response.item.properties.paymentArrangementStartDate, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('evenAmountsPaymentPeriod').patchValue(this._data.response.item.properties.evenAmountsPaymentPeriod, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('offsettingArrangementServiceID').patchValue(this._data.response.item.properties.offsettingArrangementServiceID, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('offsettingArrangementPercentage').patchValue(this._data.response.item.properties.offsettingArrangementPercentage, { emitEvent: false });

    }

    setAPIValues(): void {

        const provider = _.find(this.providers, { providerId: this._data?.response?.item?.providerID });

        this.alternativePaymentArrangementFrom.get('providerID').patchValue(provider ? provider.id : '', { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('alternativePaymentArrangementID').patchValue(this._data.response.item.alternativePaymentArrangementID, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('paymentArrangementType').patchValue(this._data.response.item.paymentArrangementType, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('paymentArrangementStartDate').patchValue(this._data.response.item.paymentArrangementStartDate, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('evenAmountsPaymentPeriod').patchValue(this._data.response.item.evenAmountsPaymentPeriod, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('offsettingArrangementServiceID').patchValue(this._data.response.item.offsettingArrangementServiceID, { emitEvent: false });
        this.alternativePaymentArrangementFrom.get('offsettingArrangementPercentage').patchValue(this._data.response.item.offsettingArrangementPercentage, { emitEvent: false });

    }

    get fc(): any {
        return this.alternativePaymentArrangementFrom.controls;
    }

    async getBase64(file: File): Promise<any> {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = () => {
                resolve(reader.result);
            }

        });

    }

    async onFormSubmit(e: MouseEvent): Promise<void> {

        e.preventDefault();

        const supportingDocuments = [];

        if(this.fc.supportingDocument.value === true && this.fileList.length > 0) {

            for (const file of this.fileList) {

                const encodedStr = await this.getBase64(file);
                const type = encodedStr.match(/[^:/]\w+(?=;|,)/)[0];
                const content = unescape(encodedStr.split(',')[1]);

                supportingDocuments.push({
                    MIMEType: type,
                    fileName: _.first(file.name.split('.')),
                    fileContent: content
                })

            }

        }

        if (this.alternativePaymentArrangementFrom.invalid) {
            return;
        }
        const sendObj = {
            provider_setup_id: this.fc.providerID.value,
            paymentArrangementType: this.fc.paymentArrangementType.value,
            paymentArrangementStartDate: DateTimeHelper.getUtcDate(this.fc.paymentArrangementStartDate.value),
            evenAmountsPaymentPeriod: this.fc.evenAmountsPaymentPeriod.value,
            offsettingArrangementServiceID: this.fc.offsettingArrangementServiceID.value,
            offsettingArrangementPercentage: this.fc.offsettingArrangementPercentage.value
        };

        if (this.fc.supportingDocument) {
            sendObj['alternativePaymentArrangementID'] = this._data.response.item.alternativePaymentArrangementID;
            sendObj['supportingDocInput'] = supportingDocuments;
        }

        if (this.editmode) {
            sendObj['id'] = this._data.response.item.id;
        }


        this.buttonLoader = true;

        this._debtService[this.editmode ? 'updateAlternativePayment' : (this.uploadmode ? 'updloadSupportingDoc' : 'createAlternativePayment')](sendObj)
            .pipe()
            .subscribe(
                res => {
                    this.buttonLoader = false;

                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error => {
                    this.buttonLoader = false;

                    throw error;
                },

            );
    }

    onDocCheckBoxChange(event: boolean): void {
        this.showUpload = event;
    }

    beforeUpload = (file: File): boolean => {
        this.fileList = this.fileList.concat(file);
        return false;
    };
}


import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProviderSetupService } from '../../services/provider-setup.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { helpMotion } from 'ng-zorro-antd';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-provider-edit-finacial',
    templateUrl: './provider-edit-finacial.component.html',
    styleUrls: ['./provider-edit-finacial.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]
})
export class ProviderEditFinacialComponent implements OnInit {

    constructor(

        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<ProviderEditFinacialComponent>,
        private _providerService: ProviderSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {

        this.providerid = _data.providerid;
        this.index = _data.index;
        this.financialData = _data.financial_data;
        this.editMode = false;
        console.log('financial data', this.financialData);
        this.buttonLoader = false;
        this._logger.debug('[provider data]', _data);



        // Set the defaults
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

    dialogRef: any;
    providers: any;
    providerForm: FormGroup;
    providerid: string;
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


    ngOnInit(): void {
        this.providerForm = this.createProviderForm();

    }

    createProviderForm(): FormGroup {
        return new FormGroup({
            date: new FormControl(this.financialData.date, [Validators.required]),
            BSB: new FormControl(this.financialData.BSB, [Validators.required]),
            accountNumber: new FormControl(this.financialData.accountNumber, [Validators.required]),
            accountName: new FormControl(this.financialData.accountName, [Validators.required]),
        });
    }

    onFormSubmit(ev: MouseEvent): void {
        ev.preventDefault();

        if (!this.providerForm.valid) {
            console.log(this.providerForm.valid + 'form data not valid');
            return;

        }

        const sentdata = {
            date: DateTimeHelper.getUtcDate(this.providerForm.get('date').value),
            BSB: this.providerForm.get('BSB').value,
            accountNumber: this.providerForm.get('accountNumber').value,
            accountName: this.providerForm.get('accountName').value,
            providerid: this.providerid,
            index: this.index,

        };

        this.buttonLoading = true;

        this._providerService
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
                        BSB: this.providerForm.get('BSB').value,
                        accountNumber: this.providerForm.get('accountNumber').value,
                        accountName: this.providerForm.get('accountName').value,
                        date: this.providerForm.get('date').value
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

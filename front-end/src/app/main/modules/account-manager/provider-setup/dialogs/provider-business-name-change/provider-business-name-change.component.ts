import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EditContactComponent } from '../edit-contact/edit-contact.component';
import { ProviderSetupService } from '../../services/provider-setup.service';
import { ProviderSetup } from '../../models/provider-setup.model';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

@Component({
  selector: 'provider-business-name-change',
  templateUrl: './provider-business-name-change.component.html',
  styleUrls: ['./provider-business-name-change.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]
})
export class ProviderBusinessNameChangeComponent implements OnInit {

    provider: any;
    providerForm: FormGroup;
    buttonLoading: boolean;
    providerData: any;
    isDisabledMode: boolean;
    apiData: any;
    
  constructor(
    private _logger: NGXLogger,
    private _matDialog: MatDialog,
    public matDialogRef: MatDialogRef<ProviderBusinessNameChangeComponent>,
    private _providerService: ProviderSetupService,
    @Inject(MAT_DIALOG_DATA) private _data: any
  ) 
    {
        console.log('data', _data);
        
        this.provider = _data.item;
        
        this.buttonLoading = false;
        this.providerData = _data.providerData;
        this.apiData = _data.apiData;
        this.isDisabledMode = this.providerData.is_synced === '3' ? false : this.providerData.is_synced === '1' ? false : true;
        // this.isDisabledMode = (this.providerData.is_synced === '0') ? true : (this.providerData.is_synced !== '3') ? true : false;
        console.log('data', this.isDisabledMode);
        this.providerForm = this.createProviderForm();
    }

  ngOnInit(): void {

  }

  createProviderForm(): FormGroup {
    return new FormGroup({
        // date: new FormControl(this.contactData.date, [Validators.required]),
        bName: new FormControl(this.isDisabledMode ? { value: this.provider.buisness_name, disabled: true } : { value: this.provider.buisness_name, disabled: false }, [Validators.required]),
        lName: new FormControl(this.isDisabledMode ? { value: this.provider.legal_name, disabled: true } : { value: this.provider.legal_name, disabled: false }, [Validators.required]),
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

        // date: this.providerForm.get('date').value,
        bName: this.providerForm.get('bName').value,
        lName: this.providerForm.get('lName').value,
        id: this.providerData.id,
        apiData: this.apiData,
        sdate: DateTimeHelper.getUtcDate(this.providerForm.get('sdate').value)

    };


    this.buttonLoading = true;

    this._providerService
        .updateBusiness(sentdata)
        .pipe(
            finalize(() => {
                this.buttonLoading = false;
            })
        )
        .subscribe((response) => {
            console.log(response);

            const obj = {
                response: response,
                data: [
                    {
                        provider_id: this.providerData.provider_id,
                        buisness_name: this.providerForm.get('bName').value,
                        legal_name: this.providerForm.get('lName').value,
                        entity_type: this.provider.entity_type,
                        ABN: this.provider.ABN,
                        commencementDate: this.provider['commencementDate']
                    }
                ] 
            };

            this.matDialogRef.close(obj);
        });


}

}

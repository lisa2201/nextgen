import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ServiceSetupService } from '../../services/service-setup.service';
import { finalize } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-service-setup-edit-name',
    templateUrl: './service-setup-edit-name.component.html',
    styleUrls: ['./service-setup-edit-name.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ServiceSetupEditNameComponent implements OnInit {

    services: any;
    nameData: any;
    apiData: any;
    serviceForm: FormGroup;
    buttonLoading: boolean;
    isDisabledMode: boolean;
    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<ServiceSetupEditNameComponent>,
        private _servicesetupService: ServiceSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) 
    {
        console.log('data', _data);
        this.nameData = _data.nameData;
        this.services = _data.serviceData;
        this.apiData = _data.apiData;
        this.isDisabledMode = this.services.is_synced === '3' ? false : this.services.is_synced === '1' ? false : true;

    }

    ngOnInit(): void {

        this.serviceForm = this.createServiceForm();
    }

    createServiceForm(): FormGroup {
        return new FormGroup({
            // date: new FormControl(this.contactData.date, [Validators.required]),
            name: new FormControl(this.isDisabledMode ? { value: this.nameData, disabled: true } : { value: this.nameData, disabled: false }, [Validators.required]),
            sdate: new FormControl(this.isDisabledMode ? { value: formatDate(new Date(), 'yyyy/MM/dd', 'en'), disabled: true } : { value: formatDate(new Date(), 'yyyy/MM/dd', 'en'), disabled: false }, [Validators.required]),
        });

    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(new Date(), current) > 0;
    }

    onFormSubmit(ev: MouseEvent): void {
        ev.preventDefault();
    
        if (!this.serviceForm.valid) {
            console.log(this.serviceForm.valid + 'form data not valid');
            return;
        }
    
        const sentdata = {

            name: this.serviceForm.get('name').value,
            id: this.services.id,
            apiData: this.apiData,
            sdate: DateTimeHelper.getUtcDate(this.serviceForm.get('sdate').value)

        };

        console.log('sentdata', sentdata);
        // this.apiData = this.apiData['ServiceName']['results'][0].name = this.serviceForm.get('name').value;
        this.apiData['ServiceName']['results'][0].name = this.serviceForm.get('name').value;
        console.log('apidata', this.apiData);
        
        this.buttonLoading = true;
    
        this._servicesetupService
            .updateBusinessName(sentdata)
            .pipe(
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {
                console.log(response);
    
                const obj = {
                    response: response,
                    data: this.apiData
                };
    
                this.matDialogRef.close(obj);
            });
    
    
    }
}

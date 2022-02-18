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
import {CcsOperationsService} from '../../ccs-operations.service';
import {MustMatch} from '../../../../../shared/validators/matchInputs';
import {NotifyType} from '../../../../../shared/enum/notify-type.enum';
import {NotificationService} from '../../../../../shared/service/notification.service';
import {ServiceSetupService} from '../../../account-manager/service-setup/services/service-setup.service';
import {Subject} from 'rxjs';

@Component({
    selector: 'service-ccms-authentication',
    templateUrl: './ccms-authentication.html',
    styleUrls: ['./ccms-authentication.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [helpMotion]

})
export class CCMSAuthenticationComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    dialogRef: any;
    action: string;
    dialogTitle: string;
    servicesetupForm: FormGroup;
    buttonLoading: boolean;
    serviceid: string;
    serviceData: any;


    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<CCMSAuthenticationComponent>,
        private _ccsOperationsService: CcsOperationsService,
        private _serviceService: ServiceSetupService,
        private _notification: NotificationService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {





        this.serviceid = this._data.response.service;
        this.serviceData = this._data.response.serviceData;
        this.dialogTitle = 'Credentials for Service ID' + this._data.response.service;

        this.servicesetupForm = this.createServicesetupForm();
    }

    ngOnInit(): void {
        this._logger.debug('serviceData from ccmsauth view load');
        this._logger.debug(this.serviceData);
        this.servicesetupForm = this.createServicesetupForm();

    }

    createServicesetupForm(): FormGroup {
        return new FormGroup({
            username: new FormControl((this.serviceData.username) ? this.serviceData.username : null, [Validators.required]),
            password: new FormControl((this.serviceData.password) ? this.serviceData.password : null, [Validators.required]),
            authPersonID: new FormControl((this.serviceData.authpersonid) ? this.serviceData.authpersonid : null, [Validators.required]),
            authPersonFirstName: new FormControl((this.serviceData.authpersonfname) ? this.serviceData.authpersonfname : null, [Validators.required]),
            authPersonLastName: new FormControl((this.serviceData.authpersonlname) ? this.serviceData.authpersonlname : null , [Validators.required]),
        });



    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(new Date(), current) > 0;
    }
    onFormSubmit(ev: MouseEvent): void {
        ev.preventDefault();

        if (!this.servicesetupForm.valid) {
            this._logger.debug(this.servicesetupForm.valid + 'form data not valid');
            return;
        }

        const sentdata = {

            username: this.servicesetupForm.get('username').value,
            password: this.servicesetupForm.get('password').value,
            authpersonid: this.servicesetupForm.get('authPersonID').value,
            authpersonfname: this.servicesetupForm.get('authPersonFirstName').value,
            authpersonlname: this.servicesetupForm.get('authPersonLastName').value,
            service: this.serviceid,

        };
        this._logger.debug('sentdata', sentdata);
        
        this.buttonLoading = true;

        this._serviceService
            .changeServiceCredentials(sentdata)
            .pipe(
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {
                this._logger.debug(response);
                this._serviceService.getServices()
                    .subscribe(
                        (responselist: any) => {
                            this._serviceService.services = responselist;
                            this._serviceService.onServiceChanged.next([...responselist]);

                        },
                    );

                setTimeout(() => this._notification.displaySnackBar(response, NotifyType.SUCCESS), 200);
                this.matDialogRef.close(response);
            });

    }

    


}

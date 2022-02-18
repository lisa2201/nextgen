import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { CcsSetup } from 'app/main/modules/ccs-setup/ccs-setup.model';
import { CommonService } from 'app/shared/service/common.service';
import { valueExists } from 'app/shared/validators/asynValidator';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ProviderSetup } from '../../../provider-setup/models/provider-setup.model';
import { ServiceSetupService } from '../../services/service-setup.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-read-service-dialog',
  templateUrl: './read-service-dialog.component.html',
  styleUrls: ['./read-service-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ReadServiceDialogComponent implements OnInit, OnDestroy {

    dialogRef: any;
    serviceForm: FormGroup;
    _unsubscribeAll: any;
    buttonLoading: boolean;
    buttonLoader: boolean;
    editMode: any;

    ccsSetups: CcsSetup[];
    providers: ProviderSetup[];

    /**
     * Constructor
     *
     * @param {MatDialogRef<ReadServiceDialogComponent>} matDialogRef
     * @param {RoleService} _providerService
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param _data
     */

    constructor(

        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<ReadServiceDialogComponent>,
        private _serviceService: ServiceSetupService,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {

        this.buttonLoading = false;
        this.buttonLoader = false;
        this.ccsSetups = this._data.ccsSetups;
        this.providers = [];

        this._unsubscribeAll = new Subject();

    }


    ngOnInit(): void {

        this._logger.debug('[ccsSetups]', this.ccsSetups);

        this.serviceForm = this.createServiceForm();

        this.serviceForm.get('ccs_setup')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value) => {

                if (!value) {
                    this.providers = [];
                } else {

                    const ccsrec = _.find(this.ccsSetups, {id: value});

                    if (ccsrec) {
                        this.providers = ccsrec.providers;
                    } else {
                        this.providers = [];
                    }
                }

            });

    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


    createServiceForm(): FormGroup {

        return new FormGroup({
            ccs_setup: new FormControl(null, [Validators.required]),
            provider: new FormControl(null, [Validators.required]),
            serviceid: new FormControl('', [Validators.required], [valueExists(this._commonService, 'service.id')])
        });

    }

    onFormSubmit(ev: MouseEvent): void {

        ev.preventDefault();

        if (!this.serviceForm.valid) {
            return;
        }

        const sentdata = {
            ccs_setup_id: this.serviceForm.get('ccs_setup').value,
            provider_id: this.serviceForm.get('provider').value,
            serviceid: this.serviceForm.get('serviceid').value
        };

        this.buttonLoader = true;


        this._serviceService
            .addService(sentdata)
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe((response) => {

                console.log(response);

                this.matDialogRef.close(response);
            });


    }
}

import { Component, OnInit, ViewEncapsulation, Inject, OnDestroy } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ProviderSetupService } from '../../services/provider-setup.service';
import { AppConst } from 'app/shared/AppConst';
import { NGXLogger } from 'ngx-logger';
import { finalize } from 'rxjs/operators';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { valueExists } from 'app/shared/validators/asynValidator';
import { CommonService } from 'app/shared/service/common.service';
import { CcsSetup } from 'app/main/modules/ccs-setup/ccs-setup.model';


@Component({
    selector: 'app-add-provider',
    templateUrl: './add-provider.component.html',
    styleUrls: ['./add-provider.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AddProviderComponent implements OnInit, OnDestroy {


    dialogRef: any;
    providerForm: FormGroup;
    _unsubscribeAll: any;
    buttonLoading: boolean;
    buttonLoader: boolean;
    editMode: any;
    ccsSetups: CcsSetup[];

    /**
     * Constructor
     *
     * @param {MatDialogRef<RoleAddOrEditDialogComponent>} matDialogRef
     * @param {RoleService} _providerService
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param _data
     */

    constructor(

        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        public matDialogRef: MatDialogRef<AddProviderComponent>,
        private _providerService: ProviderSetupService,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {

        this.buttonLoading = false;
        this.buttonLoader = false;

        this.ccsSetups = this._data.ccsSetups;

        this._unsubscribeAll = new Subject();

    }


    ngOnInit(): void {

        this._logger.debug('[ccsSetups]', this.ccsSetups);

        this.providerForm = this.createProviderForm();

    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


    createProviderForm(): FormGroup {

        return new FormGroup({
            ccs_setup: new FormControl('', [Validators.required]),
            providerid: new FormControl('', [Validators.required], [valueExists(this._commonService, 'provider.id')])
        });

    }

    onFormSubmit(ev: MouseEvent): void {

        ev.preventDefault();

        if (!this.providerForm.valid) {
            return;
        }

        const sentdata = {
            ccs_setup_id: this.providerForm.get('ccs_setup').value,
            providerid: this.providerForm.get('providerid').value
        };

        this.buttonLoader = true;


        this._providerService
            .addProviders(sentdata)
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

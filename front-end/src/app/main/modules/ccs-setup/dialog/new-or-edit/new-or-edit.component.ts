import { Component, OnInit, Inject, ViewEncapsulation } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { Subject } from "rxjs";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NGXLogger } from "ngx-logger";
import { NotificationService } from "app/shared/service/notification.service";
import { CommonService } from "app/shared/service/common.service";
import { AppConst } from "app/shared/AppConst";
import { valueExists } from "app/shared/validators/asynValidator";
import { takeUntil } from "rxjs/operators";
import { CcsSetupService } from "../../ccs-setup.service";

@Component({
    selector: "app-new-or-edit",
    templateUrl: "./new-or-edit.component.html",
    styleUrls: ["./new-or-edit.component.scss"],
    encapsulation: ViewEncapsulation.None
})
export class NewOrEditComponent implements OnInit {
    private _unsubscribeAll: Subject<any>;

    action: string;
    dialogTitle: string;
    ccsForm: FormGroup;
    editMode: boolean;
    buttonLoader: boolean;
    dissableInput: boolean;

    constructor(
        public matDialogRef: MatDialogRef<NewOrEditComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _ccsSetupService: CcsSetupService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._logger.debug("[ccs data]", _data);
        // Set the private defaults
        this._unsubscribeAll = new Subject();

        // Set the defaults
        this.editMode = false;
        this.buttonLoader = false;

        this.action = _data.action;
        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = "Renew CCS";
            this.editMode = true;
            this.dissableInput = true;
        } else {
            this.dialogTitle = "New CCS";
            this.dissableInput = false;
        }

        this.createCcsForm();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {}
    get fc(): any {
        return this.ccsForm.controls;
    }
    createCcsForm(): void {
        this.ccsForm = new FormGroup({
            activation_code: new FormControl(this.editMode ?{value:"", disabled: false }:{value:"",disabled: false },[Validators.required,Validators.maxLength(20)]),
            device_name: new FormControl(this.editMode ? {value:this._data.ccsData.device_name, disabled: true }:{value:"",disabled: false },[Validators.required,Validators.maxLength(40)]),
            proda_org_id: new FormControl(this.editMode ? {value:this._data.ccsData.PRODA_org_id, disabled: true }:{value:"",disabled: false },[Validators.required,Validators.maxLength(40)]),
            person_id: new FormControl(this.editMode ? {value:this._data.ccsData.person_id, disabled: true }:{value:"",disabled: false },[Validators.required,Validators.maxLength(40)])
        });
        setTimeout(() => {
            this.ccsForm.get('activation_code').setAsyncValidators([valueExists(this._commonService, 'ccs.code', this.editMode ? this._data.ccsData.id : '')]);
        }, 100);
    }

    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }

        this.ccsForm.reset();
    }

    onFormSubmit(e: MouseEvent): void {
        e.preventDefault();

        if (this.ccsForm.invalid) {
            return;
        }

        const sendObj = {
            activation_code: this.fc.activation_code.value,
            device_name: this.fc.device_name.value,
            proda_org_id: this.fc.proda_org_id.value,
            person_id: this.fc.person_id.value
        };
        if (this.editMode) { sendObj["id"] = this._data.ccsData.id; }

        this._logger.debug("[ccs_setup object]", sendObj);

        this.buttonLoader = true;

        this._ccsSetupService[this.editMode ? "updateCcs" : "storeCcsData"](sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
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
                () => {
                    this._logger.debug("😀 all good. 🍺");
                }
            );
    }
}

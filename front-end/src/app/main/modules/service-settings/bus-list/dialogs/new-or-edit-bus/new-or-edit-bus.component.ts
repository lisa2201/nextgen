import {Component, Inject, OnInit, ViewEncapsulation} from '@angular/core';
import {Subject} from 'rxjs';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {NGXLogger} from 'ngx-logger';
import {NotificationService} from '../../../../../../shared/service/notification.service';
import {CommonService} from '../../../../../../shared/service/common.service';
import {AppConst} from '../../../../../../shared/AppConst';
import {ActivatedRoute} from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { valueExists } from 'app/shared/validators/asynValidator';
import {HomeService} from '../../../../home/services/home.service';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {BusListService} from '../../services/bus-list.service';

@Component({
    selector: 'new-or-edit-bus',
    templateUrl: './new-or-edit-bus.component.html',
    styleUrls: ['./new-or-edit-bus.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class NewOrEditBusComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    action: string;
    view: string;
    dialogTitle: string;
    busListForm: FormGroup;
    editMode = false;

    buttonLoader = false;
    showAlert = false;

    busId: any;

    constructor(
        public matDialogRef: MatDialogRef<NewOrEditBusComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _route: ActivatedRoute,
        private _busListService: BusListService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._logger.debug('[data]', _data);
        this._unsubscribeAll = new Subject();
        this.showAlert = false;
        this.action = _data.action;
        this.view = _data.view;

        if (this.action === AppConst.modalActionTypes.EDIT) {

            this.dialogTitle = 'Edit Bus';
            this.editMode = true;
        }
        else {
            this.dialogTitle = 'New Bus';
        }

        this.createEmergencyForm();
    }

    ngOnInit(): void {
        if (this.editMode) {
            this.busId = this._data.response.bus.id;
        }
    }

    createEmergencyForm(): void {
        this.busListForm = new FormGroup({
            busName: new FormControl((this.editMode) ? this._data.response.bus.name : null, [Validators.required, Validators.maxLength(150)]),
        });
    }
    
    /**
    * Form submit handler
    */
    onFormSubmit(e: MouseEvent): void
    {
        if (this.busListForm.invalid) {
            return;
        }
        const sendData = {
            bus_id: (this.editMode) ? this.busId : null,
            bus_name: this.fc.busName.value,

        };

        this.buttonLoader = true;

        if (this.editMode)
        {
            this._busListService.updateBus(sendData)
                .pipe()
                .subscribe(
                    res => {
                        this.buttonLoader = false;
                        setTimeout(() => this.matDialogRef.close(res.message), 250);
                    },
                    error => {
                        this.buttonLoader = false;
                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
        }
        else{

            this._busListService.createBus(sendData)
                .pipe()
                .subscribe(
                    res => {
                        this.buttonLoader = false;
                        setTimeout(() => this.matDialogRef.close(res.message), 250);
                    },
                    error => {
                        this.buttonLoader = false;
                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );

        }
    }


    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }
        this.busListForm.reset();

    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.busListForm.controls;
    }


}

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
import { Bus } from '../../bus-list.model';

@Component({
    selector: 'new-or-edit-school',
    templateUrl: './new-or-edit-school.component.html',
    styleUrls: ['./new-or-edit-school.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class NewOrEditSchoolComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;
    action: string;
    view: string;
    dialogTitle: string;
    schoolListForm: FormGroup;
    editMode = false;

    buttonLoader = false;
    showAlert = false;
    busList: Bus[];

    schoolID: any;
    selectedBusList: Bus[];


    constructor(
        public matDialogRef: MatDialogRef<NewOrEditSchoolComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _route: ActivatedRoute,
        private _homeService: HomeService,
        private _busListService: BusListService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._logger.debug('[data]', _data);
        this._unsubscribeAll = new Subject();
        this.showAlert = false;
        this.action = _data.action;
        this.view = _data.view;
        this.busList = _data.busList;

        if (this.action === AppConst.modalActionTypes.EDIT) {

            this.dialogTitle = 'Edit School';
            this.editMode = true;
            this.selectedBusList = (this._data.response.school.bus) ? this._data.response.school.bus.map(x => x.id) : null;
            console.log(this.selectedBusList);
        }
        else {
            this.dialogTitle = 'New School';
        }

        this.createSchoolForm();
    }

    ngOnInit(): void {
        if (this.editMode) {
            this.schoolListForm.get('bus').patchValue((this._data.response.school.bus) ? this.selectedBusList : null, { emitEvent: false });
            this.schoolID = this._data.response.school.id;
        }
    }

    createSchoolForm(): void {
        this.schoolListForm = new FormGroup({
            schoolName: new FormControl((this.editMode)? this._data.response.school.name : null, [Validators.required, Validators.maxLength(150)]),
            schoolAddress: new FormControl((this.editMode)? this._data.response.school.address : null, [Validators.maxLength(150)]),
            bus: new FormControl((this.editMode && this._data.response.school.bus)? this.selectedBusList : null, [Validators.required]),
        });



    }
    /**
* Form submit handler
*/
    onFormSubmit(e: MouseEvent): void
    {
        if (this.schoolListForm.invalid) {
            return;
        }

        const sendData = {
            // child_id: (this.editMode) ? this._emergencyService.routeParams.id : this.childId,
            // user_id: this.fc.user_id.value,
            school_id: (this.editMode)? this.schoolID : null,
            school_name: this.fc.schoolName.value,
            school_address: this.fc.schoolAddress.value,
            bus_id: this.fc.bus.value,

        };

        this.buttonLoader = true;

        this.buttonLoader = true;

        if (this.editMode)
        {
            this._busListService.updateSchool(sendData)
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

            this._busListService.createSchool(sendData)
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
        this.schoolListForm.reset();

    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.schoolListForm.controls;
    }


}

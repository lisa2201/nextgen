import {Component, Inject, OnInit, ViewEncapsulation} from '@angular/core';
import {Subject} from 'rxjs';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {NGXLogger} from 'ngx-logger';
import {NotificationService} from '../../../../../../../shared/service/notification.service';
import {CommonService} from '../../../../../../../shared/service/common.service';
import {AppConst} from '../../../../../../../shared/AppConst';
import {EmergencyContactService} from '../../emergency-contact.service';
import {ActivatedRoute} from '@angular/router';
import {takeUntil} from 'rxjs/operators';
import {valueExists} from 'app/shared/validators/asynValidator';
import {ChildrenService} from '../../../../services/children.service';
import {helpMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';

@Component({
    selector: 'new-or-edit-emergency',
    templateUrl: './new-or-edit-emergency.component.html',
    styleUrls: ['./new-or-edit-emergency.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class NewOrEditEmergencyComponent implements OnInit {

    private _unsubscribeAll: Subject<any>;

    action: string;
    view: string;
    dialogTitle: string;
    emergencyForm: FormGroup;
    editMode = false;
    pincodenull = true;
    buttonLoader = false;
    showAlert = false;
    emergency: any;
    childId: any;
    users: any[];
    new_user: boolean;

    constructor(
        public matDialogRef: MatDialogRef<NewOrEditEmergencyComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _emergencyService: EmergencyContactService,
        private _childrenService: ChildrenService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._logger.debug('[room data]', _data);
        this._unsubscribeAll = new Subject();
        this.showAlert = false;
        this.action = _data.action;
        this.view = _data.view;
        this.new_user = true;

        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.emergency = _data.response.emergency;
            this.dialogTitle = 'Edit Emergency Contact';
            this.editMode = true;
        } else {
            this.dialogTitle = 'New Emergency Contact';
        }

        this.createEmergencyForm();
    }

    ngOnInit(): void {
        if (this.editMode) {
            this.setFormValues();
        } else {
            this.childId = this._data.response.child;
        }

        // get user list
        this._childrenService.getUsersForEmergencyContacts(this.childId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[user list]');

                this.users = response;
            });
    }

    createEmergencyForm(): void {
        this.emergencyForm = new FormGroup({
            first_name: new FormControl(null, [Validators.required, Validators.maxLength(150)]),
            last_name: new FormControl(null, [Validators.required, Validators.maxLength(150)]),
            phone: new FormControl('', [Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/), Validators.required]),
            phone2: new FormControl('', [Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]),
            address: new FormControl(null, [Validators.maxLength(500)]),
            email: new FormControl('', [Validators.email]),
            relationship: new FormControl(null, [Validators.required]),
            pincode: new FormControl(null),
            call_order: new FormControl((this.editMode) ? (this.emergency.callOrder) ? this.emergency.callOrder.toString() : null : null),
            user_id: new FormControl(null),
            consents: new FormControl(null),
            consentDropOffAndPickUp: new FormControl(false),
            consentIncursion: new FormControl(false),
            consentMakeMedicalDecision: new FormControl(false),
            consentEmergencyContact: new FormControl(false),
            consentCollectChild: new FormControl(false),
            consentTransportationArrange: new FormControl(false)
        });

        // AsyncValidators fix
        setTimeout(() => {
            this.emergencyForm.get('phone').setAsyncValidators([valueExists(this._commonService, 'user.phone', this.editMode ? this._data.response.emergency.id : '')]);
            this.emergencyForm.get('email').setAsyncValidators([valueExists(this._commonService, 'user.email', this.editMode ? this._data.response.emergency.id : '')]);
        }, 500);

    }

    /**
     * Form submit handler
     */
    onFormSubmit(e: MouseEvent): void {
        if (this.emergencyForm.invalid) {
            return;
        }

        const sendData = {
            id: (this.editMode) ? this._data.response.emergency.id : null,
            child_id: (this.editMode) ? this._emergencyService.routeParams.id : this.childId,
            user_id: this.fc.user_id.value,
            firstname: this.fc.first_name.value,
            lastname: this.fc.last_name.value,
            address: this.fc.address.value,
            email: (this.fc.email.value) ? this.fc.email.value : 'noreply@kinderm8.com.au',
            phone: this.fc.phone.value,
            mobile: this.fc.phone2.value,
            relationship: this.fc.relationship.value,
            pincode: (this.editMode) ? this.fc.pincode.value : null,
            call_order: this.fc.call_order.value,
            consentDropOffAndPickUp: this.fc.consentDropOffAndPickUp.value,
            consentEmergencyContact: this.fc.consentEmergencyContact.value,
            consentCollectChild: this.fc.consentCollectChild.value,
            consentMakeMedicalDecision: this.fc.consentMakeMedicalDecision.value,
            consentIncursion: this.fc.consentIncursion.value,
            consentTransportationArrange: this.fc.consentTransportationArrange.value,
            view: this.view
        };

        this.buttonLoader = true;

        if (this.editMode) {
            this._emergencyService.updateEmergency(sendData)
                .pipe()
                .subscribe(
                    res => {
                        this.buttonLoader = false;
                        setTimeout(() => this.matDialogRef.close(res), 250);
                    },
                    error => {
                        this.buttonLoader = false;
                        throw error;
                    },
                    () => {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
        } else {

            if (this.view === 'child_detail') {

                this._childrenService.updateEmergencyContacts(sendData)
                    .pipe()
                    .subscribe(
                        res => {
                            console.log(res);
                            this.buttonLoader = false;
                            setTimeout(() => this.matDialogRef.close(res), 250);
                        },
                        error => {
                            this.buttonLoader = false;
                            throw error;
                        },
                        () => {
                            this._logger.debug('😀 all good. 🍺');
                        }
                    );

            } else {

                this._emergencyService.addEmergency(sendData)
                    .pipe()
                    .subscribe(
                        res => {
                            console.log(res);
                            this.buttonLoader = false;
                            setTimeout(() => this.matDialogRef.close(res), 250);
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
    }


    setFormValues(): void {
        this.emergencyForm.patchValue(this._data.response.emergency);
        this.emergencyForm.get('first_name').patchValue(this._data.response.emergency.firstName);
        this.emergencyForm.get('last_name').patchValue(this._data.response.emergency.lastName);
        this.emergencyForm.get('user_id').patchValue(this._data.response.emergency.user_id);
        this.emergencyForm.get('pincode').patchValue(this._data.response.emergency.pincode);
        this.emergencyForm.get('phone2').patchValue(this._data.response.emergency.phone2);
        this.emergencyForm.get('address').patchValue(this._data.response.emergency.address1);

        if (this._data.response.emergency.pincode) {
            this.fc.pincode.disable();
            this.pincodenull = false;
        }
    }


    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }
        this.emergencyForm.reset();

    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.emergencyForm.controls;
    }

    onUserTypeChange(mode: string): void {

        if (mode === '0') {
            this.new_user = true;
        } else {
            this.new_user = false;
        }

    }

    onUserSelect(mode: string): void {

        const user = this.users.filter(t => t.id === mode)[0];

        if (!user) {
            this.emergencyForm.get('first_name').patchValue('');
            this.emergencyForm.get('last_name').patchValue('');
            this.emergencyForm.get('email').patchValue('');
            this.emergencyForm.get('phone').patchValue('');
            this.emergencyForm.get('phone2').patchValue('');
            this.emergencyForm.get('address').patchValue('');

            this.fc.first_name.enable();
            this.fc.last_name.enable();
            this.fc.email.enable();
            this.fc.phone.enable();
            this.fc.phone2.enable();
            this.fc.address.enable();
        } else {
            this.emergencyForm.get('first_name').patchValue(user.firstName);
            this.emergencyForm.get('last_name').patchValue(user.lastName);
            this.emergencyForm.get('email').patchValue(user.email);
            this.emergencyForm.get('phone').patchValue(user.mobileNumber);
            this.emergencyForm.get('phone2').patchValue(user.phoneNumber);
            this.emergencyForm.get('address').patchValue(user.address1);

            this.fc.first_name.disable();
            this.fc.last_name.disable();
            this.fc.email.disable();
            this.fc.phone.disable();
            this.fc.phone2.disable();
            this.fc.address.disable();
        }

    }

    resetPincode(e: any): void {
        e.preventDefault();
        this.emergencyForm.get('pincode').patchValue(null);
    }

}

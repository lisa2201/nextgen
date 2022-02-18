import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { User } from 'app/main/modules/user/user.model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EducatorArrayObject } from '../../is-case.model';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import * as moment from 'moment';
import { IsCaseService } from '../../services/is-case.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'app-is-claim-add-educator-dialog',
    templateUrl: './is-claim-add-educator-dialog.component.html',
    styleUrls: ['./is-claim-add-educator-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class IsClaimAddEducatorDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    isClaimEducatorForm: FormGroup;
    buttonLoading: boolean;
    educators: User[];

    editData: EducatorArrayObject;
    remainingTime: string;

    constructor(
        public matDialogRef: MatDialogRef<IsClaimAddEducatorDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _logger: NGXLogger,
        private _isCaseService: IsCaseService,
        private _notification: NotificationService
    ) {

        this.unsubscribeAll = new Subject();
        this.educators = this._data.educators ? this._data.educators : [];
        this.editData = this._data.editData ? this._data.editData : null;
        this.remainingTime = this._data.remainingTime;
        this.buttonLoading = false;
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.createForm();
    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Create form
     */
    createForm(): void {

        this.isClaimEducatorForm = this._formBuilder.group({
            educator: new FormControl(this.editData ? this.editData.educator_id : null, [Validators.required]),
            hours_claimed: new FormControl(this.editData ? this.editData.hours_claimed : null, [Validators.required, Validators.maxLength(6), this.validateTimeExceed(), Validators.pattern(/[0-9]{3}:[0-5]{1}[0-9]{1}/)]),
        });
    }

    get fc(): any {
        return this.isClaimEducatorForm.controls;
    }

    getEducatorLabel(educator: User): string {
        return `${educator.getFullName()} ${educator.ccsId ? `(${educator.ccsId})` : '' }`;
    }

    validateTimeExceed(): ValidatorFn {

        return (control: AbstractControl): ValidationErrors | null => {

            if (control.value) {

                const value: string = control.value;

                if (value.match(/[0-9]{3}:[0-5]{1}[0-9]{1}/) !== null && value.length <= 6) {
    
                    const formHours = this._isCaseService.getDisplayTimeMomentObject(value);
                    const availableHours = this._isCaseService.getDisplayTimeMomentObject(this.remainingTime);

                    const diff = availableHours.clone().subtract(formHours.clone()).asMilliseconds();

                    if (Math.sign(diff) === -1) {
                        return {exceed: true};
                    } else {
                        return null;
                    }

                } else {
                    return null;
                }

            } else {
                return null;
            }

        };

    }

    /**
     * on submit
     */
    onSubmit(): void {

        if (this.isClaimEducatorForm.invalid) {
            return;
        }

        const id = this.fc.educator.value;

        const index = _.findIndex(this.educators, {'id': id});

        const staff = this.educators[index];

        const sendObj: EducatorArrayObject = {
            ccs_id: staff.ccsId ? staff.ccsId : null,
            educator_id: staff.id,
            first_name: staff.firstName,
            last_name: staff.lastName,
            hours_claimed: this.fc.hours_claimed.value
        };

        this._logger.debug('[Educator Object]', sendObj);

        this.matDialogRef.close(sendObj);

    }

}

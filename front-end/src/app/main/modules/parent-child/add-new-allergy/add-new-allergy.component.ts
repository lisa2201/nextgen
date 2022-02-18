import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotificationService } from 'app/shared/service/notification.service';
import { helpMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { ParentChildService } from '../service/parent-child.service';

@Component({
    selector: 'app-add-new-allergy',
    templateUrl: './add-new-allergy.component.html',
    styleUrls: ['./add-new-allergy.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 }),
    ],
})
export class AddNewAllergyComponent implements OnInit {

    action: any;
    dialogTitle: string;
    allergiesList: any[];
    allergyForm: FormGroup;
    buttonValue: string;
    editmode: boolean;
    allergyData: any;

    buttonLoader: boolean;

    constructor(

        @Inject(MAT_DIALOG_DATA) private _data: any,
        public matDialogRef: MatDialogRef<AddNewAllergyComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _ParentchildService: ParentChildService,
    ) {

        this.buttonLoader = false;
        this.action = _data.action;
        if (this.action === AppConst.modalActionTypes.NEW) {
            this.dialogTitle = 'New Allergy/Special Dietary Needs';
            this.buttonValue = 'Save';
            this.editmode = false;
        } else {
            this.dialogTitle = 'Edit Allergy/Special Dietary Needs';
            this.buttonValue = 'Update';
            this.editmode = true;
            this.allergyData = _data.response.item;
        }

        this.allergiesList = _data.response.allergyTypes;
    }

    ngOnInit() {
        this._createForm();
    }

    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }

        this.allergyForm.reset();

        for (const key in this.fc) {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }
    }

    /**
     * Create form
     *
     * @returns {FormGroup}
     */
    _createForm(): void {
        this.allergyForm = new FormGroup({
            allergies: new FormControl(
                this.editmode ? this.allergyData.type.index : null,
                [Validators.required]
            ),
            description: new FormControl(
                this.editmode ? this.allergyData.description : '',
                [Validators.required, Validators.maxLength(150)]
            ),
        });
    }

    get fc(): any {
        return this.allergyForm.controls;
    }

    onFormSubmit(e: MouseEvent): void {
        e.preventDefault();

        if (this.allergyForm.invalid) {
            return;
        }
        const sendObj = {

            id: this.editmode ? this.allergyData.id : null,
            childId: this._data.response.childId,
            allergyType: this.fc.allergies.value,
            description: this.fc.description.value,
        };

        console.log(sendObj);

        this.buttonLoader = true;

        this._ParentchildService[this.editmode ? 'updateAllergy' : 'storeAllergy'](
            sendObj
        )
            .pipe()
            .subscribe(
                (res) => {
                    this.buttonLoader = false;

                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res), 250);
                },
                (error) => {
                    this.buttonLoader = false;

                    throw error;
                }
            );
    }

}

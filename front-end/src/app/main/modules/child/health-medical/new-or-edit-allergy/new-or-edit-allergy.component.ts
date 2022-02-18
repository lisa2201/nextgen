import { Component, OnInit, ViewEncapsulation, Inject } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import {
    fadeInOnEnterAnimation,
    fadeOutOnLeaveAnimation,
} from 'angular-animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ViewWaitlistComponent } from 'app/main/modules/waitlist-enrollment/list-view/dialogs/view-waitlist/view-waitlist.component';
import { AppConst } from 'app/shared/AppConst';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HealthMedicalService } from '../services/health-medical.service';
import { setInputValues } from '@angularclass/hmr';

@Component({
    selector: 'app-new-or-edit-allergy',
    templateUrl: './new-or-edit-allergy.component.html',
    styleUrls: ['./new-or-edit-allergy.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 }),
    ],
})
export class NewOrEditAllergyComponent implements OnInit {
    action: any;
    dialogTitle: string;
    allergiesList: string[];
    allergyForm: FormGroup;
    buttonValue: string;
    editmode: boolean;
    allergyData: any;

    buttonLoader: boolean;

    constructor(
        public matDialogRef: MatDialogRef<ViewWaitlistComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _healthservice: HealthMedicalService
    ) {
        this.action = _data.action;
        this.buttonLoader = false;

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

        /*this.allergiesList = [
            'Anaphylaxis',
            'Allergy',
            'Asthma',
            'Diabetes',
            'Special dietary requirements',
            'Sunscreen requirements',
            'Other',
        ];*/

        this.allergiesList = _data.response.allergyTypes;
        console.log(this.allergiesList);
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

        this._healthservice[this.editmode ? 'updateAllergy' : 'storeAllergy'](
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

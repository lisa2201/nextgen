import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { helpMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { EnrollmentsService } from '../../services/enrollments.service';

@Component({
    selector: 'app-enrolment-empty-form-print-confirm',
    templateUrl: './enrolment-empty-form-print-confirm.component.html',
    styleUrls: ['./enrolment-empty-form-print-confirm.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class EnrolmentEmptyFormPrintConfirmComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    printForm: FormGroup;
    buttonLoading: boolean;
    allergyTypes: any;
    sections: any;

    constructor(
        public matDialogRef: MatDialogRef<EnrolmentEmptyFormPrintConfirmComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _logger: NGXLogger,
        private _enrolmentsService: EnrollmentsService
    ) {

        this.unsubscribeAll = new Subject();
        this.buttonLoading = false;

        this.allergyTypes = this._data.allergyTypes;
        this.sections = this._data.sections;

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

        this.printForm = this._formBuilder.group({
            contacts: new FormControl(null, [Validators.required, Validators.min(1)]),
            allergies: new FormControl(null)
        });

    }

    get fc(): any {
        return this.printForm.controls;
    }

    get allergyArray(): FormArray {
        return this.printForm.get('allergies') as FormArray;
    }

    onSubmit(): void {

        console.log(this.printForm);

        const sendData =  {
            emergencyContacts: this.fc.contacts.value,
            allergies:  this.fc.allergies.value,
            allergyTypes: this.allergyTypes
        }

        this._logger.debug('[form data]', sendData);

        this._enrolmentsService.printEmptyEnrolment(this.sections, sendData);

        this.matDialogRef.close();

    }

}

import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef } from 'ng-zorro-antd/modal';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ryValidationTypes } from 'app/shared/components/ry-time-picker/ry-time-picker.component';

@Component({
    selector: 'set-attendance-time',
    templateUrl: './set-attendance.component.html',
    styleUrls: ['./set-attendance.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SetAttendanceTimeComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    setAttendanceForm: FormGroup;
    
    ryValidatorValues: typeof ryValidationTypes;

    @Input() selected: Array<number>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef
    )
    {
        // set default values
        this.ryValidatorValues = ryValidationTypes;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * set time picker required validation
     *
     * @param {AbstractControl} formControl
     * @returns {*}
     */
    timeRequiredValidator(formControl: AbstractControl): { [key: string]: boolean } | null
    {
        if (!formControl.parent)
        {
            return null;
        }

        if (formControl.value === '' || _.isNull(formControl.value))
        {
            return { 'required': true };
        }

        return null;
    }

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('set attendance time modal !!!', this.selected);

        this.setAttendanceForm = this.createForm();
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.setAttendanceForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            session_start_time: new FormControl(null, [this.timeRequiredValidator]),
            session_end_time: new FormControl(null),
        });
    }

    /**
     * get values
     *
     * @returns {{ start: number, end: number }}
     */
    getValue(): { start: number, end: number }
    {
        return {
            start: this.fc.session_start_time.value,
            end: this.fc.session_end_time.value,
        };
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}


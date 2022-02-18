import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { WaitingItems } from '../../list-view/tab/waiting-tab/waiting-tab.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'bulk-submission-set-update-values',
    templateUrl: './set-update-values.component.html',
    styleUrls: ['./set-update-values.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BulkSubmissionsSetUpdateValuesComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    submissionForm: FormGroup;

    @Input() item: WaitingItems;
    @Input() dependActions: any;
    @Input() dependChangeReason: any;
    @Input() calendarWeek: any;
    @Input() sessionUpdatesFound: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
    )
    {
        // set default values

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('set session update values !!!', this.item);

        this.submissionForm = this.createSubmissionForm();

        this.onChanges();

        this.setFormValues();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.submissionForm
            .get('action')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.validateAction(value));
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
        return this.submissionForm.controls; 
    }

    /**
     * returns true if control has the validator
     *
     * @param {string} control
     * @param {string} validator
     * @returns {boolean}
     */
    hasValidator(control: string, validator: string): boolean
    {
        if (_.isNull(this.submissionForm.get(control).validator))
        {
            return false;
        }

        const formControl = this.submissionForm.get(control).validator({} as AbstractControl);

        return formControl && formControl.hasOwnProperty(validator);
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createSubmissionForm(): FormGroup
    {
        return new FormGroup({
            action: new FormControl(null, [Validators.required]),
            change_reason: new FormControl(null),
            reason_late_change: new FormControl('', [Validators.maxLength(1000)]),
            reason_no_change: new FormControl('', [Validators.maxLength(1000)])
        });
    }

    /**
     * set form values
     */
    setFormValues(): void
    {
        this.submissionForm.get('action').patchValue(this.item.formValue.action);
        this.submissionForm.get('change_reason').patchValue(this.item.formValue.change_reason);
        this.submissionForm.get('reason_late_change').patchValue(this.item.formValue.reason_late_change);
        this.submissionForm.get('reason_no_change').patchValue(this.item.formValue.reason_no_change);
    }

    /**
     * check validation rules for action changes
     *
     * @param {string} value
     */
    validateAction(value: string): void
    {
        // reset validation
        this.submissionForm.get('change_reason').clearValidators();
        this.submissionForm.get('change_reason').patchValue(null, { emitEvent: false });
        this.submissionForm.get('change_reason').updateValueAndValidity();
        this.submissionForm.get('change_reason').reset();

        this.submissionForm.get('reason_late_change').clearValidators();
        this.submissionForm.get('reason_late_change').patchValue('', { emitEvent: false });
        this.submissionForm.get('reason_late_change').updateValueAndValidity();
        this.submissionForm.get('reason_late_change').reset();

        this.submissionForm.get('reason_no_change').clearValidators();
        this.submissionForm.get('reason_no_change').patchValue('', { emitEvent: false });
        this.submissionForm.get('reason_no_change').updateValueAndValidity();
        this.submissionForm.get('reason_no_change').reset();

        if (value === 'VARY')
        {
            this.submissionForm.get('change_reason').setValidators([Validators.required]);
            this.submissionForm.get('change_reason').updateValueAndValidity();

            const perms = [Validators.maxLength(1000)];
            if (DateTimeHelper.now().diff(DateTimeHelper.parseMoment(this.calendarWeek).startOf('isoWeek'), 'days') >= 28) perms.push(Validators.required);
            
            this.submissionForm.get('reason_late_change').setValidators(perms);
            this.submissionForm.get('reason_late_change').updateValueAndValidity();
        }

        if (value === 'NOCHG')
        {
            this.submissionForm.get('reason_no_change').setValidators([Validators.required, Validators.maxLength(1000)]);
            this.submissionForm.get('reason_no_change').updateValueAndValidity();
        }
    }

    /**
     * get form values
     *
     * @returns {*}
     */
    getValues(): any
    {
        return {
            action: this.fc.action.value,
            change_reason: this.fc.change_reason.value,
            reason_late_change: this.fc.reason_late_change.value,
            reason_no_change: this.fc.reason_no_change.value,
        }
    }
}

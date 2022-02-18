import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';

import { NzModalRef } from 'ng-zorro-antd/modal';

import { ChildBookingService } from 'app/main/modules/child/booking/services/booking.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Booking } from 'app/main/modules/child/booking/booking.model';
import { ryValidationTypes } from 'app/shared/components/ry-time-picker/ry-time-picker.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Component({
    selector: 'update-session-slot',
    templateUrl: './update-session-slot.component.html',
    styleUrls: ['./update-session-slot.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class UpdateSessionSlotComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    updateSessionSlotForm: FormGroup;
    absReasons: any;
    showAbsReasonInput: boolean;
    showAttendanceInput: boolean;
    bookingTypes: Array<any> = [
        {
            name: 'Attendance',
            value: '1'
        },
        {
            name: 'Absence',
            value: '2'
        },
        {
            name: 'Holiday',
            value: '3'
        }
    ];

    ryValidatorValues: typeof ryValidationTypes;

    @Input() reasons: any;
    @Input() selected: Booking;

    
    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {NzModalRef} _modal
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef,
        private _notificationService: NotificationService,
        private _bookingService: ChildBookingService,
    )
    {
        // set default values
        this.showAbsReasonInput = false;
        this.showAttendanceInput = false;
        this.ryValidatorValues = ryValidationTypes;
        
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
        this._logger.debug('update session slot - modal !!!', this.selected);

        this.absReasons = this.reasons;

        this.updateSessionSlotForm = this.createForm();

        this.onChanges();

        if(this.selected.statusCode !== '0')
        {
            this.setFormValues();
        }
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.updateSessionSlotForm
            .get('type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.onBookingTypeChange(value));
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
        return this.updateSessionSlotForm.controls; 
    }

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
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup
    {
        return new FormGroup({
            type: new FormControl(null, [Validators.required]),
            absence: new FormControl(null),
            absent_document_held: new FormControl(null),
            session_start: new FormControl(null),
            session_end: new FormControl(null),
            session_time: new FormControl(null)
        });
    }

    /**
     * set form values 
     */
    setFormValues(): void
    {
        this.updateSessionSlotForm.get('type').patchValue(this.selected.statusCode);

        if (this.selected.statusCode === '1')
        {
            this.updateSessionSlotForm.get('session_start').patchValue(this.selected.attendance.checkInTime);
            this.updateSessionSlotForm.get('session_end').patchValue(this.selected.attendance.checkOutTime);
        }

        if (this.selected.statusCode === '2')
        {
            this.updateSessionSlotForm.get('absence').patchValue(this.selected.absenceNoteCode);
            this.updateSessionSlotForm.get('absent_document_held').patchValue(this.selected.isAbsentDocumentHeld);
        }
    }

    /**
     * attach validators on type change
     *
     * @param {string} value
     */
    onBookingTypeChange(value: string): void
    {
        // clear validation
        this.updateSessionSlotForm.get('absence').clearValidators();
        this.updateSessionSlotForm.get('session_start').clearValidators();
        this.updateSessionSlotForm.get('session_end').clearValidators();

        // set default values
        this.updateSessionSlotForm.get('absence').patchValue(this.selected ? this.selected.absenceNoteCode : _.head(Object.keys(this.absReasons)), { eventEmit: false });
        this.updateSessionSlotForm.get('absent_document_held').patchValue(this.selected ? this.selected.isAbsentDocumentHeld : false, { eventEmit: false });
        this.updateSessionSlotForm.get('session_start').patchValue(null, { eventEmit: false });
        this.updateSessionSlotForm.get('session_end').patchValue(null, { eventEmit: false });

        this.showAbsReasonInput = this.showAttendanceInput = false;

        if (value === '1')
        {
            this.updateSessionSlotForm.get('session_start').setValidators([this.timeRequiredValidator]);
            this.updateSessionSlotForm.get('session_end').setValidators([this.timeRequiredValidator]);

            this.showAttendanceInput = true;
        }
        else if (value === '2')
        {   
            this.updateSessionSlotForm.get('absence').setValidators([Validators.required]);

            this.showAbsReasonInput = true;
        }

        setTimeout(() =>
        {
            this.updateSessionSlotForm.get('absence').updateValueAndValidity();
            this.updateSessionSlotForm.get('session_start').updateValueAndValidity();
            this.updateSessionSlotForm.get('session_end').updateValueAndValidity();
        }, 50);
    }

    /**
     * change booking type
     */
    saveChanges(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            const sendObj = {
                id: this.selected.id,
                type: this.fc.type.value,
                abs_reason: this.fc.absence.value,
                abs_doc_held: (this.fc.type.value === '2') ? this.fc.absent_document_held.value : false,
                start_time: this.fc.session_start.value || null,
                end_time: this.fc.session_end.value || null
            };

            this._logger.debug('[update single child booking type]', sendObj);

            this._bookingService
                .updateBookingType(sendObj)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    response => resolve(response),
                    errorRes => 
                    {
                        setTimeout(() => this._notificationService.displaySnackBar(errorRes.error.message, NotifyType.ERROR), 200);
                        
                        reject(errorRes);
                    }
                );
        });
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}

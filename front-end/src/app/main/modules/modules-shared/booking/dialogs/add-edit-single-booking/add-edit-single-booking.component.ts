import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import { fadeMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildBookingService } from 'app/main/modules/child/booking/services/booking.service';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';

import { AuthClient } from 'app/shared/model/authClient';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ryValidationTypes } from 'app/shared/components/ry-time-picker/ry-time-picker.component';
import { CommonHelper } from 'app/utils/common.helper';

@Component({
    selector: 'child-add-edit-single-booking',
    templateUrl: './add-edit-single-booking.component.html',
    styleUrls: ['./add-edit-single-booking.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        fuseAnimations,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildAddEditSingleBookingComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    bookingForm: FormGroup;

    action: string;
    buttonLoader: boolean;
    editMode: boolean;

    child: Child;
    rooms: Room[];
    fees: Fee[];
    filteredFees: Fee[];
    client: AuthClient;
    calendarBookingDate: Date;
    response: Booking;

    absReasons: any;
    showAbsReasonInput: boolean;

    showAttendanceInput: boolean;

    bookingTypes:Array<any> = [
        {
            name: 'Booked',
            value: '0'
        },
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

    confirmModal: NzModalRef;

    ryValidatorValues: typeof ryValidationTypes;

    editInitialValues: any;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<ChildAddEditSingleBookingComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {MatDialog} _matDialog
     * @param {ChildBookingService} _bookingService
     * @param {AuthService} _authService
     * @param {NzModalService} _modalService
     * @param {ChangeDetectorRef} _cdr
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ChildAddEditSingleBookingComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _bookingService: ChildBookingService,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.response = this._data.response;
        this.action = this._data.action;
        this.editMode = _.isObject(this._data) && !_.isEmpty(this._data) && AppConst.modalActionTypes.EDIT === this.action;
        this.dialogTitle = !this.editMode ? 'Create Casual Booking' : 'Edit Single Booking';
        this.client = this._authService.getClient();
        this.calendarBookingDate = this._data.calendar_date;
        this.fees = !this.editMode ? this._data.fees : this._data.fees.filter(i => !i.isArchived() || (i.isArchived() && i.id === this.response.fee.id));
        this.filteredFees = [];
        this.child = this._data.child;
        this.rooms = this.child.rooms;
        this.absReasons = this._data.abs_reason;
        this.buttonLoader = false;
        this.showAbsReasonInput = false;
        this.showAttendanceInput = false;
        this.ryValidatorValues = ryValidationTypes;
        this.editInitialValues = null;

        this.bookingForm = this.createSingleBookingForm();

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
        this._logger.debug('add/edit single booking !!!', this._data);

        this.onChanges();
    }

    /**
     * on after view int
     */
    ngAfterViewInit(): void
    {
        setTimeout(() => 
        {
            if (this.editMode && this.checkForCurrentFee())
            {
                this.bookingForm.get('fees').patchValue(null);
            }

            if (this.editMode) this.editInitialValues = this.bookingForm.value;

            this._cdr.markForCheck();
        }, 50);
    }

    /**
     * On change
     */
    onChanges(): void
    {
        if (this.editMode)
        {
            this.onBookingTypeChange(this.response.statusCode);

            this.setSessionTimeValidator();

            this.selectFeeOnRoomChange(this.response.room.id);

            this.bookingForm.get('fees').patchValue(this.response.fee.id, { emitEvent: false });
        }

        if (this.rooms.length === 1 && !this.editMode)
        {
            this.selectFeeOnRoomChange(_.head(this.rooms).id);
        }

        // Subscribe to form value changes
        this.bookingForm
            .get('type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.onBookingTypeChange(value));

        this.bookingForm
            .get('fees')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                if (_.isNull(value) || _.isNull(this.fc.room.value))
                {
                    return;
                }
                
                this.bookingForm.get('casual').patchValue(_.isNull(value) ? null : (this.fees.find(i => i.id === value).type === '0') ? '0' : '1', { emitEvent: false });

                this.checkSessionTimeValidation();
            });        
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }
        
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
        return this.bookingForm.controls; 
    }

    /**
     * check if edit view has changes
     *
     * @returns {boolean}
     */
    enableUpdateButton(): boolean
    {
        return !_.isNull(this.editInitialValues) && !CommonHelper.isEqual(this.editInitialValues, this.bookingForm.value);
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createSingleBookingForm(): FormGroup
    {
        return new FormGroup({
            date: new FormControl({ value: this.calendarBookingDate, disabled: this.editMode }, [Validators.required]),
            room: new FormControl((this.rooms.length === 1 && !this.editMode) ? _.head(this.rooms).id : (this.editMode ? this.response.room.id : null), [Validators.required]),
            fees: new FormControl(this.editMode ? this.response.fee.id : null, [Validators.required]),
            type: new FormControl(this.editMode ? this.response.statusCode : null, [Validators.required]),
            absence: new FormControl(null),
            session_start: new FormControl(null),
            session_end: new FormControl((this.editMode && !_.isNull(this.response.attendance) && (!_.isNull(this.response.attendance.checkOutTime) || !_.isNull(this.response.attendance.parentCheckOutTime))) ? ((!_.isNull(this.response.attendance.parentCheckOutTime)) ? this.response.attendance.parentCheckOutTime : this.response.attendance.checkOutTime) : null),
            casual: new FormControl(this.editMode ? (this.response.isCasual ? '0' : '1') : '1'),
            session_time: new FormControl(this.editMode ? [
                this.response.sessionStart,
                this.response.sessionEnd
            ] : null),
            absent_document_held: new FormControl(this.editMode ? this.response.isAbsentDocumentHeld : false)
        });
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
     * check fee has session start and end time
     *
     * @returns {boolean}
     */
    checkFeeHasSessionTime(): boolean
    {
        return !_.isNull(this.fc.fees.value) 
            && this.fees.find(i => i.id === this.fc.fees.value) 
            && !this.fees.find(i => i.id === this.fc.fees.value).hasSession();
    }

    /**
     * assign validation if fee doesn't have session time
     */
    checkSessionTimeValidation(): void
    {
        // clear validators
        this.bookingForm.get('session_time').clearValidators();
        
        this.bookingForm.get('session_time').patchValue(null, { emitEvent: false });
        this.bookingForm.get('session_time').updateValueAndValidity();
        this.bookingForm.get('session_time').reset();

        this.setSessionTimeValidator();

        this._cdr.markForCheck();
    }

    /**
     * set session time validator
     */
    setSessionTimeValidator(): void
    {
        if (!this.checkFeeHasSessionTime())
        {
            return;
        }

        this.bookingForm.get('session_time').setValidators(this.timeRequiredValidator);

        this.bookingForm.get('session_time').updateValueAndValidity();
    }

    /**
     * attach validators on type change
     *
     * @param {string} value
     */
    onBookingTypeChange(value: string): void
    {
        // clear validation
        this.bookingForm.get('absence').clearValidators();
        this.bookingForm.get('session_start').clearValidators();

        // set default values
        this.bookingForm.get('absence').patchValue(this.editMode ? this.response.absenceNoteCode : _.head(Object.keys(this.absReasons)), { eventEmit: false });
        this.bookingForm.get('absent_document_held').patchValue(this.editMode ? this.response.isAbsentDocumentHeld : false, { eventEmit: false });
        this.bookingForm.get('session_start').patchValue((this.editMode && !_.isNull(this.response.attendance) && (!_.isNull(this.response.attendance.checkInTime) || !_.isNull(this.response.attendance.parentCheckInTime))) ? ((!_.isNull(this.response.attendance.parentCheckInTime)) ? this.response.attendance.parentCheckInTime: this.response.attendance.checkInTime) : null, { eventEmit: false });

        // reset
        this.showAbsReasonInput = this.showAttendanceInput = false;

        if (value === '1')
        {
            this.bookingForm.get('session_start').setValidators([this.timeRequiredValidator]);

            this.showAttendanceInput = true;
        }
        else if (value === '2')
        {   
            this.bookingForm.get('absence').setValidators([Validators.required]);

            this.showAbsReasonInput = true;
        }

        // fee adjust - edit - not booking type
        if (this.editMode)
        {
            (value !== '0' && this.checkForCurrentFee()) 
                ? this.bookingForm.get('fees').clearValidators() 
                : this.bookingForm.get('fees').setValidators([Validators.required])
        }

        setTimeout(() =>
        {
            this.bookingForm.get('fees').updateValueAndValidity({ emitEvent: false });
            this.bookingForm.get('absence').updateValueAndValidity();
            this.bookingForm.get('session_start').updateValueAndValidity();

            this._cdr.markForCheck();
        }, 50);
    }

    /**
     * filter fees by room
     *
     * @param {*} value
     */
    selectFeeOnRoomChange(value: any): void
    {
        this.bookingForm.get('fees').patchValue(null, { emitEvent: false });
        this.bookingForm.get('fees').markAsPristine();
        this.bookingForm.get('fees').markAsUntouched();
        this.bookingForm.get('fees').updateValueAndValidity();

        if (!_.isNull(value))
        {
            const fees: Fee[] = this.fees.filter(i => i.rooms.filter(r => r.id === value).length > 0);
            
            this.filteredFees = _.isEmpty(fees) ? this.fees : fees;
        }
        else
        {
            this.filteredFees = [];
        }
    }

    /**
     * get fee information
     *
     * @param {string} id
     * @returns {Fee}
     */
    getFeeInfo(id: string): Fee
    {
        return this.fees.find(i => i.id === id);
    }

    /**
     * check to show current fee amount
     *
     * @returns {boolean}
     */
    checkForCurrentFee(): boolean
    {
        return (this.editMode && this.response && this.response.fee
            && this.getFeeInfo(this.response.fee.id) 
            && (!_.isNull(this.getFeeInfo(this.response.fee.id).getCurrentAdjusted()) 
            && this.getFeeInfo(this.response.fee.id).getCurrentAdjusted().netAmount !== this.response.getBookingFeeAmount()));
    }

    /**
     * check if fee is optional for adjusted fee
     *
     * @returns {boolean}
     */
    isFeeOptional(): boolean
    {
        return this.checkForCurrentFee() && _.isNull(this.fc.fees.value);
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.bookingForm.invalid || this.buttonLoader) 
        {
            return;
        }

        const sendObj = {
            child: this.child.id,
            date: DateTimeHelper.getUtcDate(this.fc.date.value),
            room: this.fc.room.value,
            fee: this.fc.fees.value,
            fee_optional: this.isFeeOptional(),
            type: this.fc.type.value,
            abs_reason: this.fc.absence.value,
            abs_doc_held: (this.fc.type.value === '2') ? this.fc.absent_document_held.value : false,
            // attendance
            start_time: this.fc.session_start.value || null,
            end_time: this.fc.session_end.value || null
        };

        if (!_.isNull(this.fc.fees.value) && !this.getFeeInfo(this.fc.fees.value).hasSession() && !_.isNull(this.fc.session_time.value))
        {
            sendObj['hourly_start'] = _.head(this.fc.session_time.value) || null;
            sendObj['hourly_end'] = _.last(this.fc.session_time.value) || null;
        }

        if (this.getFeeInfo(this.fc.fees.value) && !_.isNull(this.getFeeInfo(this.fc.fees.value).getCurrentAdjusted()))
        {
            sendObj['adjust_fee_id'] = this.getFeeInfo(this.fc.fees.value).getCurrentAdjusted().id;
        }

        if (this.editMode)
        {
            sendObj['index'] = this.response.id;
            sendObj['casual'] = this.fc.casual.value === '0';
        } 

        this._logger.debug('[create/update single child booking]', sendObj);

        this.buttonLoader = true;

        this._bookingService[this.editMode ? 'updateSingleBooking' : 'storeSingleBooking'](sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => 
                {
                    setTimeout(() => 
                    { 
                        this.buttonLoader = false;
                        
                        this._cdr.markForCheck();
                    }, 200) 
                })
            )
            .subscribe(
                response =>
                {
                    if (!response)
                    {
                        return;
                    }

                    // this._bookingService.onUpdateCalendarDateChanged.next({
                    //     action: !this.editMode ? AppConst.modalActionTypes.NEW : AppConst.modalActionTypes.EDIT,
                    //     selected: this.calendarBookingItem,
                    //     booking: response.item
                    // });

                    setTimeout(() => this.matDialogRef.close(response.message), 250);
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * delete selected booking
     *
     * @param {MouseEvent} e
     */
    delete(e: MouseEvent): void
    {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () =>
                    {
                        return new Promise((resolve, reject) =>
                        {
                            this._bookingService
                                .deleteBooking(this.response.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message =>
                                    {
                                        // this._bookingService.onUpdateCalendarDateChanged.next({
                                        //     action: !AppConst.modalActionTypes.DELETE,
                                        //     selected: this.calendarBookingItem,
                                        //     booking: this.response
                                        // });

                                        setTimeout(() => this.matDialogRef.close(message), 250);
                                    },
                                    error =>
                                    {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }
}

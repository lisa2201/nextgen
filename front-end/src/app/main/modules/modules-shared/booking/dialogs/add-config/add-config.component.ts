import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, ElementRef, Renderer2, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';

import { slideMotion } from 'ng-zorro-antd';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';

import { Room } from 'app/main/modules/room/models/room.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { AuthClient } from 'app/shared/model/authClient';
import { AppConst } from 'app/shared/AppConst';
import { BookingTime } from 'app/main/modules/child/booking/dialogs/add-bookings/add-bookings.component';

@Component({
    selector: 'booking-add-config',
    templateUrl: './add-config.component.html',
    styleUrls: ['./add-config.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingAddConfigComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    title: string;
    action: string;
    bookingConfigForm: FormGroup;

    client: AuthClient;
    rooms: Room[];
    fees: Fee[];
    filteredFees: Fee[];
    selectedValues: BookingTime[];

    validateSession: boolean;
    editMode: boolean;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<BookingAddConfigComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     * @param {ElementRef} _element
     * @param {Renderer2} _renderer
     * @param {ChangeDetectorRef} cdr
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<BookingAddConfigComponent>,
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _element: ElementRef,
        private _renderer: Renderer2,
        public cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.action = this._data.action;
        this.editMode = _.isObject(this._data) && !_.isEmpty(this._data) && AppConst.modalActionTypes.EDIT === this.action;
        this.title = !this.editMode ? 'New Configuration' : 'Edit Configuration';
        this.client = this._authService.getClient();
        this.rooms = this._data.rooms;
        this.selectedValues = this._data.response;
        // this.fees = !this.editMode ? this._data.fees.filter((i: Fee) => _.findIndex(this.selectedValues, (slot: any) => i.id === slot.fee.id) === -1) : this._data.fees;
        this.fees = this._data.fees;
        this.validateSession = false;
        
        this.selectFeeOnRoomChange(this.selectedValues[this.editMode ? this._data.index : 0].room.id);
        
        this.bookingConfigForm = this.createBookingConfigForm();
        
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
        this._logger.debug('booking add config !!!', this._data);

        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.bookingConfigForm
            .get('fee')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.checkSessionTimeValidation());

        // initial attach on edit
        if(this.editMode)
        {
            this.setSessionTimeValidator();
        }
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
        return this.bookingConfigForm.controls; 
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
    createBookingConfigForm(): FormGroup
    {
        return new FormGroup({
            room: new FormControl(this.selectedValues[this.editMode ? this._data.index : 0].room.id, [Validators.required]),
            fee: new FormControl(this.editMode ? this.selectedValues[this._data.index].fee.id : null, [Validators.required]),
            session_time: new FormControl(this.editMode ? [
                this.selectedValues[this._data.index].start,
                this.selectedValues[this._data.index].end
            ] : null)
        });
    }

    /**
     * check fee has session start and end time
     *
     * @returns {boolean}
     */
    checkFeeHasSessionTime(): boolean
    {
        return !_.isNull(this.fc.fee.value) && !this.fees.find(i => i.id === this.fc.fee.value).hasSession();
    }

    /**
     * assign validation if fee doesn't have session time
     */
    checkSessionTimeValidation(): void
    {
        // clear validators
        this.bookingConfigForm.get('session_time').clearValidators();

        this.bookingConfigForm.get('session_time').patchValue(null, { emitEvent: false });
        this.bookingConfigForm.get('session_time').updateValueAndValidity();
        this.bookingConfigForm.get('session_time').reset();

        this.setSessionTimeValidator();
    }

    /**
     * set session time validator
     */
    setSessionTimeValidator(): void
    {
        if (this.checkFeeHasSessionTime())
        {    
            this.bookingConfigForm.get('session_time').setValidators(this.timeRequiredValidator);

            this.bookingConfigForm.get('session_time').updateValueAndValidity();
        }
    }

    /**
     * check if session is overlapping
     *
     * @returns {boolean}
     */
    validateFeeSessionOverlap(): boolean
    {
        let overlap = false;

        const selected: Fee = this.fees.find(i => i.id === this.fc.fee.value);

        if (!selected || (!selected.hasSession() && _.isNull(this.fc.session_time.value))
            || (this.editMode && (this.selectedValues[this._data.index].fee.id === selected.id || this.selectedValues.length === 1)))
        {
            return overlap;    
        }

        const sessionStart = selected.hasSession() ? selected.sessionStart : _.head(this.fc.session_time.value);
        const sessionEnd = selected.hasSession() ? selected.sessionEnd : _.last(this.fc.session_time.value);
        
        // if edit - remove selected item from booking slots
        const filteredList = this.editMode
            ? this.selectedValues.filter((i: BookingTime) => i.fee.id !== this.selectedValues[this._data.index].fee.id)
            : this.selectedValues; 

        for (const el of filteredList)
        {
            if (sessionStart < el.end && el.start < sessionEnd)
            {
                overlap = true;

                break;
            }
        }

        return overlap;
    }

    /**
     * filter fees by room
     *
     * @param {*} value
     */
    selectFeeOnRoomChange(value: any): void
    {
        if (this.bookingConfigForm)
        {
            this.bookingConfigForm.get('fee').patchValue(null, { emitEvent: false });
        }

        const fees: Fee[] = this.fees.filter(i => i.rooms.filter(r => r.id === value).length > 0);
        
        this.filteredFees = _.isEmpty(fees) ? this.fees : fees;
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
     * apply changes
     *
     * @param {MouseEvent} e
     */
    apply(e: MouseEvent): void
    {
        e.preventDefault();

        this.matDialogRef.close({
            room: this.rooms.find(i => i.id === this.fc.room.value),
            fee: this.fees.find(i => i.id === this.fc.fee.value),
            session: this.fc.session_time.value
        });
    }
}


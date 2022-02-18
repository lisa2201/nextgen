import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import * as _ from 'lodash';
import * as uuid from 'uuid';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NzModalRef } from 'ng-zorro-antd';

import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { BookingMasterRollCoreService } from '../../services/booking-core.service';

import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { AuthClient } from 'app/shared/model/authClient';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { BookingDayTime, ChildAddBookingComponent } from 'app/main/modules/child/booking/dialogs/add-bookings/add-bookings.component';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

@Component({
    selector: 'add-master-roll-bookings',
    templateUrl: './add-master-roll-bookings.component.html',
    styleUrls: ['./add-master-roll-bookings.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AddMasterRollBookingsComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    bookingForm: FormGroup;

    buttonLoader: boolean;
    buttonSaveLoader: boolean;

    children: Child[];
    rooms: Room[];
    fees: Fee[];
    filteredFees: Fee[];
    client: AuthClient;

    frequencyList = [
        {
            name: 'Casual',
            value: '0'
        },
        {
            name: 'Weekly',
            value: '1'
        },
        {
            name: 'Alternate Week',
            value: '2'
        }
    ];

    attendanceList: any;
    bookingDateTimeMap: BookingDayTime[];
    bookingErrorStatus: string;

    preview: boolean;
    previewData: any;
    isAllPreviewDataChecked: boolean;
    isPreviewIndeterminate: boolean;
    previewBookingSlotErrorStatus: string;

    dialogRef: any;
    confirmModal: NzModalRef;

    buttonLoaderHistory: boolean;
    nonLinkedRoomsFound: boolean;
    hideWeekEnd: boolean;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<ChildAddBookingComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {BookingMasterRollCoreService} _masterRollService
     * @param {AuthService} _authService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ChildAddBookingComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _masterRollService: BookingMasterRollCoreService,
        private _authService: AuthService,
        private _fuseSidebarService: FuseSidebarService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.children = this._data.children;
        this.fees = this._data.fees;
        this.filteredFees = [];
        // this.rooms = this._data.rooms.filter((i: Room) => _.indexOf(_.uniq([].concat.apply([], this.children.map(c => c.rooms.map(r => r.id)))), i.id) > -1);
        this.rooms = this._data.rooms;
        this.client = this._authService.getClient();

        this.buttonLoader = false;
        this.buttonSaveLoader = false;
        this.dialogTitle = 'Create Multiple Bookings';

        this.attendanceList = this._commonService.getWeekDays({
            hideWeekEnd: false,
            weekStartsAt: 1
        });
        this.bookingDateTimeMap = [];
        this.bookingErrorStatus = '';

        this.preview = false;
        this.previewData = [];
        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.buttonLoaderHistory = false;
        this.nonLinkedRoomsFound = false;
        this.hideWeekEnd = true;

        this.bookingForm = this.createBookingForm();

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
        this._logger.debug('child - add booking !!!', this._data);

        // filter fees
        if (this.rooms.length === 1)
        {
            this.selectFeeOnRoomChange(_.head(this.rooms).id);
        }

        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.bookingForm
            .get('frequency')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.addBookingDayTimeCheckbox(value));

        this.bookingForm
            .get('fees')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                setTimeout(() =>
                {
                    this.bookingForm.get('frequency').patchValue(null, { emitEvent: false });
                    this.bookingForm.get('frequency').updateValueAndValidity({ emitEvent: false });
                    this.bookingForm.get('frequency').reset();

                    this.bookingForm.get('start_date').patchValue(null, { emitEvent: false });
                    this.bookingForm.get('start_date').updateValueAndValidity();
                    this.bookingForm.get('start_date').reset();

                    this.bookingForm.get('end_date').patchValue(null, { emitEvent: false });
                    this.bookingForm.get('end_date').updateValueAndValidity();
                    this.bookingForm.get('end_date').reset();

                    // reset list
                    this.bookingDateTimeMap = [];
            
                    (this.fc.booking_days as FormArray).clear();

                    setTimeout(() => this.updateScroll());
                    
                    this.checkSessionTimeValidation();
                });
            });
        
        this.bookingForm
            .get('room')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this.bookingForm.get('fees').patchValue(null, { emitEvent: false });
                this.bookingForm.get('fees').markAsPristine();
                this.bookingForm.get('fees').markAsUntouched();
                this.bookingForm.get('fees').updateValueAndValidity();

                if (_.isNull(value))
                {
                    this.filteredFees = [];

                    return;
                }

                this.selectFeeOnRoomChange(value);

                // validate future dates
                // this.nonLinkedRoomsFound = _.indexOf(_.uniq([].concat.apply([], this.children.map(c => c.rooms.map(r => r.id)))), value) === -1;
                this.nonLinkedRoomsFound = (this.children.length > 1) 
                    ? this.children.map(c => c.rooms.filter(r => r.id === value).length < 1).some(i => i)
                    : this.children[0].rooms.filter(r => r.id === value).length < 1;
                
                if (!_.isNull(this.fc.frequency.value)) setTimeout(() => this.addBookingDayTimeCheckbox(this.fc.frequency.value), 250);
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
     * update page scroll
     */
    updateScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    /**
     * Toggle sidebar
     *
     * @param name
     */
    toggleSidebar(name: string): void
    {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.bookingForm.controls; 
    }

    /**
     * disable start date
     */
    disabledStartDate = (startValue: Date): boolean =>
    {
        if (!this.nonLinkedRoomsFound)
        {
            if (!startValue || !this.fc.end_date.value)
            {
                return false;
            }
    
            return startValue.getTime() > this.fc.end_date.value.getTime();
        }
        else 
        {
            return differenceInCalendarDays(startValue, DateTimeHelper.now().toDate()) < 1;
        }
    }

    /**
     * disable end date
     */
    disabledEndDate = (endValue: Date): boolean =>
    {
        if (!endValue || !this.fc.start_date.value)
        {
            return false;
        }

        return endValue.getTime() <= this.fc.start_date.value.getTime();
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
    createBookingForm(): FormGroup
    {
        return new FormGroup({
            room: new FormControl(this.rooms.length === 1 ? _.head(this.rooms).id : null, [Validators.required]),
            frequency: new FormControl(null, [Validators.required]),
            fees: new FormControl(null, [Validators.required]),
            start_date: new FormControl('', [Validators.required]),
            end_date: new FormControl('', [Validators.required]),
            booking_days: new FormArray([]),
            session_time: new FormControl(null)
        });
    }

    /**
     * add booking day & time to form array
     */
    addBookingDayTimeCheckbox(value: string): void
    {
        // clear end date validation on casual
        this.checkEndDateValidation();

        // fee not selected
        if (!this.fc.fees.value)
        {
            return;
        }

        // clear booking slots
        this.bookingDateTimeMap = [];

        // reset list
        (this.fc.booking_days as FormArray).clear();

        // value not found
        if (!value)
        {
            return;
        }

        // reset start & end date
        if (value === '0') 
        {
            this.bookingForm.get('start_date').patchValue('', { emitEvent: false });
            this.bookingForm.get('start_date').updateValueAndValidity();
            this.bookingForm.get('start_date').reset();

            this.bookingForm.get('end_date').patchValue('', { emitEvent: false });
            this.bookingForm.get('end_date').updateValueAndValidity();
            this.bookingForm.get('end_date').reset();
        }

        // build booking slots
        setTimeout(() =>
        {
            const feeObj: Fee = this.fees.find(i => i.id === this.fc.fees.value);

            // casual
            if (value === '0')
            {
                const control = new FormControl(true);
                (this.fc.booking_days as FormArray).push(control);

                this.bookingDateTimeMap.push({
                    id: uuid.v4(),
                    index: this.bookingDateTimeMap.length,
                    day_name: null,
                    disable: false,
                    value: [
                        {
                            room: !_.isNull(this.fc.room.value) ? this.rooms.find(i => i.id === this.fc.room.value) : null,
                            fee: feeObj,
                            start: !feeObj.hasSession() ? _.head(this.fc.session_time.value) : this.fees.find(i => i.id === this.fc.fees.value).sessionStart,
                            end: !feeObj.hasSession() ? _.last(this.fc.session_time.value) : this.fees.find(i => i.id === this.fc.fees.value).sessionEnd
                        }
                    ]
                });
            }
            else
            {
                for (const v of this.attendanceList)
                {
                    if (this.hideWeekEnd && (v.index === 5 || v.index === 6))
                    {
                        continue;
                    }
                        
                    const control = new FormControl(false);
                    (this.fc.booking_days as FormArray).push(control);
        
                    this.bookingDateTimeMap.push({
                        id: uuid.v4(),
                        index: this.bookingDateTimeMap.length,
                        day_name: v.name,
                        disable: true,
                        value: [
                            {
                                room: !_.isNull(this.fc.room.value) ? this.rooms.find(i => i.id === this.fc.room.value) : null,
                                fee: feeObj,
                                start: !feeObj.hasSession() ? _.head(this.fc.session_time.value) : this.fees.find(i => i.id === this.fc.fees.value).sessionStart,
                                end: !feeObj.hasSession() ? _.last(this.fc.session_time.value) : this.fees.find(i => i.id === this.fc.fees.value).sessionEnd
                            }
                        ]
                    });
                }
            }
 
            // add validation
            this.bookingForm.get('booking_days').clearValidators();
            
            this.bookingForm.get('booking_days').setValidators(minSelectedCheckboxes());
        });
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

        if (this.checkFeeHasSessionTime())
        {    
            this.bookingForm.get('session_time').setValidators(this.timeRequiredValidator);

            this.bookingForm.get('session_time').updateValueAndValidity();
        }
    }

    /**
     * assign validation for end date
     */
    checkEndDateValidation(): void
    {
        this.bookingForm.get('end_date').clearValidators();

        if (this.fc.frequency.value !== '0')
        {
            this.bookingForm.get('end_date').setValidators([Validators.required]);
        }
    }

    /**
     * check fee has session start and end time
     *
     * @returns {boolean}
     */
    checkFeeHasSessionTime(): boolean
    {
        return !_.isNull(this.fc.fees.value) && !this.getFeeInfo(this.fc.fees.value).hasSession();
    }

    /**
     * update single day & time
     */
    updateSingleChecked(event: MouseEvent, day: any): void
    {
        event.preventDefault();

        this.bookingDateTimeMap[day.index].disable = !this.bookingDateTimeMap[day.index].disable;

        // error message fix
        this.fc.booking_days.markAllAsTouched();

        this.hasBookingSelectionFormError();
    }

    /**
     * check if booking selection has error
     */
    hasBookingSelectionFormError(): void
    {
        this.bookingErrorStatus = (this.bookingForm.get('booking_days').hasError('required') && this.bookingForm.get('booking_days').touched) ? 'error' : '';
    }

    /**
     * filter fees by room
     *
     * @param {*} value
     */
    selectFeeOnRoomChange(value: any): void
    {
        const fees: Fee[] = this.fees.filter(i => i.rooms.filter(r => r.id === value).length > 0);
        
        this.filteredFees = _.isEmpty(fees) ? this.fees : fees;
    }

    /**
     * trigger on fee change
     *
     * @param {*} value
     */
    onFeeChange(value: any): void
    {
        // this.bookingDateTimeMap.forEach(i => i.fee.id = value);
    }

    /**
     * trigger on frequency change
     *
     * @param {*} value
     */
    onFrequencyChange(value: any): void
    {
        
    }

    /**
     * get frequency options by fees type
     *
     * @readonly
     * @type {*}
     */
    get getFrequencyOptions(): any
    {
        if (!this.fc.fees.value) return;

        return this.frequencyList.filter(i => this.getFeeInfo(this.fc.fees.value).isCasual() ? i.value === '0' : i.value !== '0');
    }

    /**
     * select all items
     *
     * @param {boolean} value
     * @returns {void}
     */
    checkAllPreviews(value: boolean): void
    {
        if (_.isEmpty(this.previewData))
        {
            return;
        }

        this.previewData
            .filter((i: { disabled: boolean; }) => !i.disabled)
            .forEach((i: { selected: boolean; }) => i.selected = value);

        this.refreshPreviewStatus();
    }

    /**
     * get selected preview slot items
     */
    getSelectedPreviewSlotItems(): any
    {
        return this.previewData.filter((i: { disabled: boolean; selected: boolean; }) => !i.disabled && i.selected);
    }

    /**
     * check if booking preview slots selected
     */
    hasPreviewSlotSelected(): boolean
    {
        return this.getSelectedPreviewSlotItems().length > 0;
    }

    /**
     * check preview booking slots selected
     */
    refreshPreviewStatus(): void
    {
        this.isAllPreviewDataChecked = this.previewData
            .filter((i: { disabled: boolean; }) => !i.disabled)
            .every((i: { selected: boolean; }) => i.selected);
        
        this.isPreviewIndeterminate = this.previewData.filter(i => !i.disabled).some(i => i.selected) && !this.isAllPreviewDataChecked;

        this.previewBookingSlotErrorStatus = !this.hasPreviewSlotSelected() ? 'error' : '';
    }

    /**
     * get child information
     *
     * @param {string} id
     * @returns {Fee}
     */
    getChildInfo(id: string): Child
    {
        return this.children.find(i => i.id === id);
    }

    /**
     * get room information
     *
     * @param {string} id
     * @returns {Room}
     */
    getRoomInfo(id: string): Room
    {
        return this.rooms.find(i => i.id === id);
    }

    /**
     * check if room linked with child
     *
     * @param {Room} room
     * @returns {boolean}
     */
    isRoomLinked(room: Room): boolean
    {
        return this.children.filter(i => i.rooms.filter(r => r.id === room.id).length > 0).length > 0;
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
     * get preview label
     *
     * @returns {{ start :string, end: string }}
     */
    getPreviewLabel(): { start :string, end: string }
    {
        return {
            start: DateTimeHelper.parseMomentTzDateTime(this.fc.start_date.value).date,
            end: DateTimeHelper.parseMomentTzDateTime(this.fc.end_date.value).date
        }
    }

    /**
     * preview booking dates
     *
     * @param {MouseEvent} e
     */
    previewSlots(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.buttonLoaderHistory)
        {
            return;
        }

        let filteredList: any = [];

        for (const item of this.bookingDateTimeMap.filter(i => !i.disable))
        {
            const valueMap = [];

            for (const value of item.value)
            {
                valueMap.push({
                    room: value.room.id,
                    fee: value.fee.id,
                    fee_amount: value.fee.netAmount,
                    start: value.start,
                    end: value.end
                });
            }

            if (this.fc.frequency.value !== '0')
            {
                filteredList.push({
                    day: _.toLower(item.day_name),
                    values: valueMap
                });
            }
            else
            {
                filteredList = valueMap;
            }
        }

        const sendObj = {
            children: this.children.map(i => i.id),
            date_start: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            type: this.fc.frequency.value,
            room: this.fc.room.value,
            slots: filteredList
        };

        if (this.fc.frequency.value !== '0')
        {
            sendObj['date_end'] = DateTimeHelper.getUtcDate(this.fc.end_date.value);
        }

        this._logger.debug('[preview booking request]', sendObj);

        this.buttonLoader = true;

        this._masterRollService
            .getPreviewSlots(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response)) { return; }

                    this.previewData = response;

                    this.preview = true;

                    setTimeout(() =>
                    {
                        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 50);

                        this.updateScroll();
                    });
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * close booking preview view
     *
     * @param {MouseEvent} e
     */
    closePreview(e: MouseEvent): void
    {
        e.preventDefault();

        setTimeout(() => 
        {
            this.preview = false;
    
            this.previewData = [];
            this.previewBookingSlotErrorStatus = '';
            this.isAllPreviewDataChecked = false;
            this.isPreviewIndeterminate = false;
            
            this.buttonSaveLoader = false;

            this.updateScroll();
        }, 0);
    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.bookingForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.bookingDateTimeMap = [];
        this.bookingErrorStatus = '';

        this.preview = false;
        this.previewData = [];
        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.bookingForm.invalid || !this.hasPreviewSlotSelected()) 
        {
            return;
        }

        const sendObj = {
            children: this.children.map(i => i.id),
            casual: this.fc.frequency.value === '0',
            slots: this.getSelectedPreviewSlotItems()
                .map((obj: any) => ({...obj}))
                .map((i: { linked_rooms: any; child: { rooms: { id: string; }[]; id: any; }; adjusted_fee: string; fee: string; }) => 
                {
                    i.linked_rooms = i.child.rooms.map((r: { id: string; }) => r.id);
                    i.child = i.child.id;
                    i.adjusted_fee = (this.getFeeInfo(i.fee) && !_.isNull(this.getFeeInfo(i.fee).getCurrentAdjusted())) ? this.getFeeInfo(i.fee).getCurrentAdjusted().id : null;
                    return i;
                })
        };

        this._logger.debug('[submit master roll bookings]', sendObj);

        this.buttonSaveLoader = true;

        this._masterRollService
            .storeBookings(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonSaveLoader = false)
            )
            .subscribe(
                res => setTimeout(() => this.matDialogRef.close(res), 250),
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * update booking history loading status
     *
     * @param {boolean} status
     */
    updateHistoryLoadingStatus(status: boolean): void
    {
        setTimeout(() => this.buttonLoaderHistory = status);
    }
    
}

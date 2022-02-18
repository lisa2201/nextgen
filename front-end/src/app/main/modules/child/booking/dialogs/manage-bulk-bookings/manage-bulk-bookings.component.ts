import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject, ViewChild, ElementRef } from '@angular/core';
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

import { ChildBookingService } from '../../services/booking.service';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';

import { AuthClient } from 'app/shared/model/authClient';
import { Child } from '../../../child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';

import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { BookingHistoryItem } from 'app/main/modules/modules-shared/booking/components/view-history/view-history.component';
import { CommonHelper } from 'app/utils/common.helper';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { SetAbsenceReasonComponent } from 'app/main/modules/modules-shared/booking/modals/set-absence-reason/set-absence-reason.component';

@Component({

    selector: 'child-manage-bulk-bookings',
    templateUrl: './manage-bulk-bookings.component.html',
    styleUrls: ['./manage-bulk-bookings.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildManageBulkBookingsComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    bookingForm: FormGroup;

    child: Child;
    rooms: Room[];
    fees: Fee[];
    absReasons: any;
    client: AuthClient;
    buttonLoader: boolean;
    manageButtonLoader: boolean;
    weekDays: any;

    actionOptions = [
        {
            name: 'Update',
            value: '0'
        },
        {
            name: 'Delete',
            value: '1'
        }
    ];

    updateOperations = [
        {
            name: 'Change Room',
            value: '0'
        },
        {
            name: 'Change Fee',
            value: '1'
        },
        {
            name: 'Change Holiday',
            value: '2'
        },
        {
            name: 'Change Absence',
            value: '3'
        },
        {
            name: 'Change Days',
            value: '4'
        }
    ];

    previewUpdateSlots: boolean;
    previewData: any;
    previewFilterOptions: { rooms: any, fees: any, children: any };
    isAllPreviewDataChecked: boolean;
    isPreviewIndeterminate: boolean;
    previewBookingSlotErrorStatus: string;
    buttonLoaderHistory: boolean;

    confirmModal: NzModalRef;
    setAbsenceReasonModal: NzModalRef;

    selectedSummeryItem: BookingHistoryItem;
    previewFilter: { room: string[], fee: string[] };

    @ViewChild('buttonGroup')
    buttonGroup: ElementRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<ChildManageBulkBookingsComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {MatDialog} _matDialog
     * @param {ChildBookingService} _bookingService
     * @param {AuthService} _authService
     * @param {NzModalService} _modalService
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ChildManageBulkBookingsComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _bookingService: ChildBookingService,
        private _authService: AuthService,
        private _modalService: NzModalService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.fees = this._data.fees;
        this.child = this._data.child;
        this.rooms = this._data.rooms;
        this.absReasons = this._data.abs_reason;
        this.client = this._authService.getClient();
        this.buttonLoader = false;
        this.manageButtonLoader = false;
        this.weekDays = this._commonService.getWeekDays({
            hideWeekEnd: false,
            weekStartsAt: 1
        });
        this.previewUpdateSlots = false;
        this.previewData = [];
        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;
        this.previewFilterOptions = {
            rooms: [],
            fees: [],
            children: []
        };
        this.buttonLoaderHistory = false;
        this.selectedSummeryItem = null;
        this.previewFilter = {
            room: [],
            fee: []
        };

        this.selectedSummeryItem = null;

        this.bookingForm = this.createManageBookingForm();

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
        this._logger.debug('manage child bulk bookings !!!', this._data);

        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.bookingForm
            .get('action')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.showUpdateOptions(value));
        
        this.bookingForm
            .get('operation')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.showUpdateOptionsFields(value));

        this.bookingForm
            .get('fees')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.checkSessionTimeValidation());
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

        if (this.setAbsenceReasonModal)
        {
            this.setAbsenceReasonModal.close();    
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
     * page scroll to bottom
     */
    scrollToBottom(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.scrollToBottom(0 , 100);
        }
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
        if (!startValue || !this.fc.end_date.value)
        {
            return false;
        }

        return startValue.getTime() > this.fc.end_date.value.getTime();
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
     * check fee has session start and end time
     *
     * @returns {boolean}
     */
    checkFeeHasSessionTime(): boolean
    {
        return !_.isNull(this.fc.fees.value) && !this.fees.find(i => i.id === this.fc.fees.value).hasSession();
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createManageBookingForm(): FormGroup
    {
        return new FormGroup({
            start_date: new FormControl('', [Validators.required]),
            end_date: new FormControl('', [Validators.required]),
            days: new FormControl(_.compact(this.weekDays.map((i: any) => !i.weekend ? _.toString(i.index) : null)), [Validators.required]),
            action: new FormControl(null, [Validators.required]),
            operation: new FormControl(null, [Validators.required]),
            room: new FormControl(null),
            fees: new FormControl(null),
            absence: new FormControl(null),
            session_time: new FormControl(null),
            summary_option: new FormControl(null),
            absent_document_held: new FormControl(false)
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
     * show/hide action options
     *
     * @param {string} value
     */
    showUpdateOptions(value: string): void
    {
        // reset dynamic fields
        this.bookingForm.get('operation').clearValidators();
        this.bookingForm.get('operation').reset();
        this.bookingForm.get('operation').patchValue(null, { emitEvent: false });

        this.bookingForm.get('summary_option').clearValidators();
        this.bookingForm.get('summary_option').reset();
        this.bookingForm.get('summary_option').patchValue(null, { emitEvent: false });

        if (value === '0')
        {
            this.bookingForm.get('operation').setValidators([Validators.required]);
            this.bookingForm.get('operation').updateValueAndValidity();
        }

        if (this.selectedSummeryItem && !(this.selectedSummeryItem.bookings.length === 1 || (this.selectedSummeryItem.rooms.length === 1 && this.selectedSummeryItem.fees.length === 1)))
        {
            this.bookingForm.get('summary_option').setValidators([Validators.required]);
            this.bookingForm.get('summary_option').updateValueAndValidity();
            
            setTimeout(() => this.updateScroll(), 315);
        }
    }

    /**
     * show/hide operation options
     *
     * @param {string} value
     */
    showUpdateOptionsFields(value: string): void
    {
        // reset dynamic fields
        this.bookingForm.get('room').clearValidators();
        this.bookingForm.get('room').reset();
        this.bookingForm.get('room').patchValue(null, { emitEvent: false });

        this.bookingForm.get('fees').clearValidators();
        this.bookingForm.get('fees').reset();
        this.bookingForm.get('fees').patchValue(null, { emitEvent: false });

        this.bookingForm.get('absence').clearValidators();
        this.bookingForm.get('absence').reset();
        this.bookingForm.get('absence').patchValue(_.head(Object.keys(this.absReasons)), { emitEvent: false });

        this.bookingForm.get('session_time').clearValidators();
        this.bookingForm.get('session_time').reset();
        this.bookingForm.get('session_time').patchValue(null, { emitEvent: false });

        this.bookingForm.get('absent_document_held').patchValue(false, { eventEmit: false });

        if (value === '0')
        {
            this.bookingForm.get('room').setValidators([Validators.required]);
            this.bookingForm.get('room').updateValueAndValidity();
        }

        if (value === '1')
        {
            this.bookingForm.get('fees').setValidators([Validators.required]);
            this.bookingForm.get('fees').updateValueAndValidity();
        }

        if (value === '3')
        {
            this.bookingForm.get('absence').setValidators([Validators.required]);
            this.bookingForm.get('absence').updateValueAndValidity();
        }

        setTimeout(() => this.scrollToBottom(), 50);
    }

    /**
     * get operation label
     *
     * @returns {string}
     */
    getOperationLabel(): string
    {
        return _.upperFirst(_.toLower((this.updateOperations.find(i => i.value === this.fc.operation.value).name)));
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

        if (this.isPreviewColumFiltered())
        {
            this.previewData
                .filter((i: { disabled: boolean; filtered: boolean; }) => !i.disabled && i.filtered)
                .forEach((i: { selected: boolean; }) => i.selected = value);
        }
        else
        {
            this.previewData
                .filter((i: { disabled: boolean; }) => !i.disabled)
                .forEach((i: { selected: boolean; }) => i.selected = value);
        }

        this.refreshPreviewStatus();
    }

    /**
     * check preview data available
     *
     * @returns {boolean}
     */
    hasPreviewData(): boolean
    {
        return this.isPreviewColumFiltered() 
            ? this.previewData.filter((i: { disabled: boolean; filtered: boolean; }) => !i.disabled && i.filtered).length > 0
            : this.previewData.filter((i: { disabled: boolean; }) => !i.disabled).length > 0;
    }

    /**
     * get selected preview slot items
     */
    getSelectedPreviewSlotItems(): any
    {
        return (this.isPreviewColumFiltered()) 
            ? this.previewData.filter((i: { disabled: boolean; selected: boolean; filtered: boolean; }) => !i.disabled && i.selected && i.filtered)
            : this.previewData.filter((i: { disabled: boolean; selected: boolean; }) => !i.disabled && i.selected);
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
        if (this.isPreviewColumFiltered())
        {
            this.isAllPreviewDataChecked = !_.isEmpty(this.previewData.filter((i: { disabled: boolean; filtered: boolean;}) => !i.disabled && i.filtered)) 
                ? this.previewData.filter((i: { disabled: boolean; filtered: boolean;}) => !i.disabled && i.filtered).every((i: { selected: boolean; }) => i.selected)
                : false;

            this.isPreviewIndeterminate = this.previewData.filter(i => !i.disabled && i.filtered).some(i => i.selected) && !this.isAllPreviewDataChecked;
        }
        else
        {
            this.isAllPreviewDataChecked = this.previewData
                .filter((i: { disabled: boolean; }) => !i.disabled)
                .every((i: { selected: boolean; }) => i.selected);
            
            this.isPreviewIndeterminate = this.previewData.filter(i => !i.disabled).some(i => i.selected) && !this.isAllPreviewDataChecked;
        }

        this.previewBookingSlotErrorStatus = !this.hasPreviewSlotSelected() ? 'error' : '';
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

        const sendObj = {
            child: this.child.id,
            date_start: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            date_end: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            days: _.compact(this.weekDays.map((i: any) => _.indexOf(this.fc.days.value, _.toString(i.index)) > -1 ? _.toLower(i.name) : null)) || [],
            action: this.fc.action.value,
            operation: this.fc.operation.value,
            room: (this.fc.operation.value === '0') ? this.fc.room.value : null,
            fee: (this.fc.operation.value === '1') ? this.fc.fees.value : null,
            abs_reason: (this.fc.operation.value === '3') ? this.fc.absence.value : null,
            abs_doc_held: (this.fc.operation.value === '3') ? this.fc.absent_document_held.value : false,
        };

        if (!_.isNull(this.fc.fees.value) && !this.getFeeInfo(this.fc.fees.value).hasSession() && !_.isNull(this.fc.session_time.value))
        {
            sendObj['hourly_start'] = _.head(this.fc.session_time.value) || null;
            sendObj['hourly_end'] = _.last(this.fc.session_time.value) || null;
        }

        if (!_.isNull(this.fc.fees.value) && this.getFeeInfo(this.fc.fees.value) && !_.isNull(this.getFeeInfo(this.fc.fees.value).getCurrentAdjusted()))
        {
            sendObj['adjust_fee_id'] = this.getFeeInfo(this.fc.fees.value).getCurrentAdjusted().id;
        }

        if (!_.isNull(this.selectedSummeryItem))
        {
            if (this.selectedSummeryItem.bookings.length === 1 || (this.selectedSummeryItem.rooms.length === 1 && this.selectedSummeryItem.fees.length === 1))
            {
                sendObj['summary_filter'] = { rooms: [_.head(this.selectedSummeryItem.rooms).id], fees: [_.head(this.selectedSummeryItem.fees).id]  };
            }
            else
            {
                const summaryOption = this.fc.summary_option.value.includes('f-') ? 'fees' : 'rooms';
                const isAllSelected = this.fc.summary_option.value.includes('-0');
                
                sendObj['summary_filter'] = {};
                sendObj['summary_filter'][summaryOption.toString()] = isAllSelected ? _.map(<Array<any>>this.selectedSummeryItem[summaryOption], 'id') : [_.replace(this.fc.summary_option.value, ((summaryOption === 'fees') ? 'f-' : 'r-'), '')];
            }
        }

        this._logger.debug('[preview booking request]', sendObj);

        this.buttonLoader = true;

        this._bookingService
            .getUpdatePreviewSlots(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response)) { return; }

                    this.previewFilterOptions = this.getFilterOptions(response);

                    this.previewData = response;

                    this.previewUpdateSlots = true;

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

        this.previewUpdateSlots = false;

        this.previewData = [];
        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.previewFilterOptions = {
            rooms: [],
            fees: [],
            children: []
        };

        this.previewFilter = {
            room: [],
            fee: []
        };
        
        this.manageButtonLoader = false;
    }

    /**
     * get preview label
     *
     * @returns {any}
     */
    getFeePreviewLabel(): { start: number, end: number }
    {
        const fee: Fee = this.getFeeInfo(this.fc.fees.value);

        if (!fee.hasSession())
        {
            return {
                start: _.head(this.fc.session_time.value),
                end: _.last(this.fc.session_time.value),
            };
        }
        else
        {
            return {
                start: fee.sessionStart,
                end: fee.sessionEnd
            };    
        }
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
     * edit ccs absence reason
     *
     * @param {MouseEvent} e
     * @param {*} item
     */
    editAbsenceReason(e: MouseEvent, item: any): void
    {
        e.preventDefault();

        this.setAbsenceReasonModal = this._modalService
            .create({
                nzTitle: 'Edit CCS Absence Reason',
                nzContent: SetAbsenceReasonComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'set-absence-reason-modal',
                nzComponentParams: {
                    reasons: this.absReasons,
                    selected: item
                },
                nzFooter: [
                    {
                        label: 'SAVE',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.setAbsenceReasonForm.valid),
                        onClick: componentInstance =>
                        {
                            const index = this.previewData.findIndex((i: { id: string; }) => i.id === item.id);

                            if (index > -1 && !_.isEmpty(componentInstance.getValue()))
                            {
                                this.previewData[index].ab_code = componentInstance.getValue().abs_code;
                                this.previewData[index].abs_doc_held = componentInstance.getValue().abs_doc_held;
                            }
   
                            this.setAbsenceReasonModal.destroy();
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.setAbsenceReasonModal.destroy()
                    }
                ]
            });
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

        this.bookingForm.get('days').patchValue(_.compact(this.weekDays.map((i: any) => !i.weekend ? _.toString(i.index) : null)));

        this.previewBookingSlotErrorStatus = '';

        this.previewUpdateSlots = false;
        this.previewData = [];
        this.previewBookingSlotErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.previewFilterOptions = {
            rooms: [],
            fees: [],
            children: []
        };

        this.previewFilter = {
            room: [],
            fee: []
        };
        
        this.selectedSummeryItem = null;
    }

    /**
     * update/delete bookings
     *
     * @param {MouseEvent} e
     */
    manageBookings(e: MouseEvent, action: string): void
    {
        e.preventDefault();

        if (this.bookingForm.invalid || !this.hasPreviewSlotSelected())
        {
            return;    
        }

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: (action === '0') ? AppConst.dialogContent.UPDATE.TITLE : AppConst.dialogContent.DELETE.TITLE,
                    nzContent: (action === '0') ? AppConst.dialogContent.UPDATE.BODY : AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: (action === '0') ? 'primary' : 'danger',
                    nzOnOk: () =>
                    {
                        return new Promise((resolve, reject) =>
                        { 
                            const sendObj = {
                                action: action,
                                operation: this.fc.operation.value,
                                room: (this.fc.operation.value === '0') ? this.fc.room.value : null,
                                fee: (this.fc.operation.value === '1') ? this.fc.fees.value : null,
                                child: this.child.id,
                                slots: this.getSelectedPreviewSlotItems().map((i: any) => ({ 
                                    id: i.id, 
                                    abs_reason: i.ab_code, 
                                    abs_doc_held: i.abs_doc_held,
                                    room: i.room,
                                    fee: i.fee,
                                    date: i.date,
                                    child: i.child.id, 
                                    is_future: i.is_future
                                }))
                            };

                            if (!_.isNull(this.fc.fees.value) && !this.getFeeInfo(this.fc.fees.value).hasSession() && !_.isNull(this.fc.session_time.value))
                            {
                                sendObj['hourly_start'] = _.head(this.fc.session_time.value) || null;
                                sendObj['hourly_end'] = _.last(this.fc.session_time.value) || null;
                            }

                            if (this.fc.action.value === '0' && this.fc.operation.value === '4')
                            {
                                sendObj['date_start'] = DateTimeHelper.getUtcDate(this.fc.start_date.value);
                                sendObj['date_end'] = DateTimeHelper.getUtcDate(this.fc.end_date.value);
                            }

                            if (this.getFeeInfo(this.fc.fees.value) && !_.isNull(this.getFeeInfo(this.fc.fees.value).getCurrentAdjusted()))
                            {
                                sendObj['adjust_fee_id'] = this.getFeeInfo(this.fc.fees.value).getCurrentAdjusted().id;
                            }
    
                            this._logger.debug('[manage booking update/delete]', sendObj);
    
                            this.manageButtonLoader = true;
    
                            this._bookingService
                                .manageBooking(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() =>
                                    {
                                        this.manageButtonLoader = false;

                                        resolve();
                                    })
                                )
                                .subscribe(
                                    res => setTimeout(() => this.matDialogRef.close(res), 250),
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

    /**
     * update booking history loading status
     *
     * @param {boolean} status
     */
    updateHistoryLoadingStatus(status: boolean): void
    {
        setTimeout(() => this.buttonLoaderHistory = status);
    }

    /**
     * on booking history select
     *
     * @param {{ action: string, item: BookingHistoryItem }} data
     */
    onBookingHistorySelect(data: { action: string, item: BookingHistoryItem }): void
    {
        this.selectedSummeryItem = data.item;

        setTimeout(() => 
        {
            this.bookingForm.get('start_date').setValue(DateTimeHelper.parseMoment(data.item.startDate).toDate());
            this.bookingForm.get('end_date').setValue(DateTimeHelper.parseMoment(data.item.endDate).toDate());
            this.bookingForm.get('days').setValue(_.compact(this.weekDays.map((i: any) => _.indexOf(data.item.bookings.map(b => b.day), _.toLower(i.name)) > -1 ? _.toString(i.index) : null)));
            this.bookingForm.get('action').setValue(data.action === 'edit' ? _.head(this.actionOptions).value : _.last(this.actionOptions).value);

            this.updateScroll();
        }, 150);
    }

    /**
     * verify if deletion options can be shown
     *
     * @returns {boolean}
     */
    showSummaryOption(): boolean
    {
        return this.selectedSummeryItem 
            && (this.fc.action.value === '1' || (this.fc.action.value === '0' && this.fc.operation.value))
            && !(this.selectedSummeryItem.bookings.length === 1 || (this.selectedSummeryItem.rooms.length === 1 && this.selectedSummeryItem.fees.length === 1));
    }

    /**
     * get filter options
     *
     * @param {*} response
     * @returns {*}
     */
    getFilterOptions(response: any): any
    {
        return {
            rooms: this.rooms.filter(i => _.indexOf(_.uniq(response.map(r => r.room)), i.id) > -1).map(i => { return { text: i.title, value: i.id }}),
            fees: this.fees.filter(i => _.indexOf(_.uniq(response.map(f => f.fee)), i.id) > -1).map(i => { return { text: i.name, value: i.id }}),
            // children: this.children.filter(i => _.indexOf(_.uniq(response.map(c => c.child.id)), i.id) > -1)
        };
    }

    /**
     * room filters
     *
     * @param {string[]} list
     * @param {*} item
     * @returns {*}
     */
    filterColumnRoom(list: string[], item: any): any
    {
        return list.some(name => item.room.indexOf(name) !== -1);
    }

    /**
     * fee filter
     *
     * @param {string[]} list
     * @param {*} item
     * @returns {*}
     */
    filterColumnFee(list: string[], item: any): any
    {
        return list.some(name => item.fee.indexOf(name) !== -1);
    }

    /**
     * on filter change
     *
     * @param {*} values
     * @param {string} [option='0']
     */
    filterChange(values: any, option: string = '0'): void
    {
        // set filter value
        (option === '0') ? this.previewFilter.room = values : this.previewFilter.fee = values;

        // reset filters
        this.previewData.forEach((i: { selected: boolean; filtered: boolean; }) => i.selected = i.filtered = false);

        // set filters
        this.previewData.forEach(i => { if (CommonHelper.multiPropsFilter(this.previewData, this.previewFilter).filter(f => f.id === i.id).length > 0) i.filtered = true; });   

        setTimeout(() => 
        {
            this.refreshPreviewStatus();

            this.updateScroll();
        });
    }

    /**
     * has filters selected
     *
     * @returns {boolean}
     */
    isPreviewColumFiltered(): boolean
    {
        return Object.keys(this.previewFilter).some(i => !_.isEmpty(this.previewFilter[i]));
    }

    /**
     * clear filters
     *
     * @param {MouseEvent} e
     */
    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();

        this.previewFilterOptions = this.getFilterOptions(this.previewData);

        this.previewFilter = {
            room: [],
            fee: []
        };

        // reset filters
        this.previewData.forEach((i: { selected: boolean; filtered: boolean; }) => i.selected = i.filtered = false);

        setTimeout(() => 
        {
            this.refreshPreviewStatus();

            this.updateScroll();
        });
    }

    /**
     * check for filter options
     *
     * @param {Array<object>} option
     * @returns {boolean}
     */
    showFilterOptions(option: Array<object>): boolean
    {
        return (this.selectedSummeryItem) 
            ? !(this.selectedSummeryItem.bookings.length === 1 || option.length === 1) 
            : option.length > 1;
    }

    /**
     * show selected filters
     *
     * @readonly
     * @type {string}
     */
    get getSelectedFilters(): string
    {
        const filters: Array<string> = [];

        for (const key in this.previewFilter)
        {
            if (key === 'room')
            {
                this.rooms.filter(i => _.indexOf(this.previewFilter[key], i.id) > -1).forEach(i => filters.push(i.title));
            }

            if (key === 'fee')
            {
                this.fees.filter(i => _.indexOf(this.previewFilter[key], i.id) > -1).forEach(i => filters.push(i.name));
            }
        }

        return _.join(filters, ', ');
    }

    /**
     * verify if deletion options can be shown
     *
     * @returns {boolean}
     */
    showDeleteOption(): boolean
    {
        return this.fc.action.value === '1' && this.selectedSummeryItem 
            && !(this.selectedSummeryItem.bookings.length === 1 || (this.selectedSummeryItem.rooms.length === 1 && this.selectedSummeryItem.fees.length === 1));
    }
}

import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, Inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { ChildBookingService } from 'app/main/modules/child/booking/services/booking.service';

import { Child } from 'app/main/modules/child/child.model';
import { Booking } from 'app/main/modules/child/booking/booking.model';
import { AuthClient } from 'app/shared/model/authClient';

import endOfWeek  from 'date-fns/endOfWeek';
import startOfWeek from 'date-fns/startOfWeek';
import startOfMonth from 'date-fns/startOfMonth';
import endOfMonth from 'date-fns/endOfMonth';
import addMonths from 'date-fns/addMonths';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { AppConst } from 'app/shared/AppConst';

import { Attendance } from 'app/main/modules/child/attendance/attendance.model';
import { SetAttendanceTimeComponent } from '../../modals/set-attendance/set-attendance.component';
import { ryValidationTypes } from 'app/shared/components/ry-time-picker/ry-time-picker.component';

export interface BulkAttendanceItem {
    date: string;
    child: string;
    booking: string;
    isNew: boolean;
    checkInTime: number;
    checkInUser: string;
    checkOutTime: number;
    checkOutUser: string;
}

@Component({
    selector: 'batch-update-attendance',
    templateUrl: './batch-update-attendance.component.html',
    styleUrls: ['./batch-update-attendance.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BatchUpdateAttendanceComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    bookingForm: FormGroup;

    buttonLoader: boolean;
    buttonSaveLoader: boolean;

    children: Child[];
    client: AuthClient;
    batchTypeOptions: Array<any> = [
        {
            name: 'Day Selection',
            value: '0'
        },
        {
            name: 'Week Selection',
            value: '1'
        },
        {
            name: 'Custom Selection',
            value: '2'
        }
    ] 

    dateRanges: any = { 
        'Today': [new Date(), new Date()], 
        'This Week': [startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 })], 
        'This Month': [startOfMonth(new Date()), endOfMonth(new Date())],
        '3 Months': [startOfMonth(new Date()), addMonths(endOfMonth(new Date()), 3)],
    };

    preview: boolean;
    previewData: Booking[];
    attendanceData: BulkAttendanceItem[];
    isAllPreviewDataChecked: boolean;
    isPreviewIndeterminate: boolean;
    previewBatchUpdateErrorStatus: string;

    dialogRef: any;
    confirmModal: NzModalRef;
    setAttendanceModal: NzModalRef;

    ryValidatorValues: typeof ryValidationTypes;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    @ViewChildren('timePicker', { read: ElementRef }) 
    timePickers: QueryList<ElementRef>

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        public matDialogRef: MatDialogRef<BatchUpdateAttendanceComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _bookingService: ChildBookingService,
        public _cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.children = this._data.children;
        this.client = this._authService.getClient();

        this.buttonLoader = false;
        this.buttonSaveLoader = false;
        this.dialogTitle = 'Bulk Attendance Update';

        this.preview = false;
        this.previewData = [];
        this.attendanceData = [];
        this.previewBatchUpdateErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.ryValidatorValues = ryValidationTypes;

        this.bookingForm = this.createBookingForm();

        this.setTypeDefaultValue();

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
        this._logger.debug('master roll batch attendance update !!!');

        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        // Subscribe to form value changes
        this.bookingForm
            .get('type')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.onTypeChange(value));
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

        if (this.setAttendanceModal)
        {
            this.setAttendanceModal.close();    
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
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createBookingForm(): FormGroup
    {
        return new FormGroup({
            type: new FormControl(null, [Validators.required]),
            date: new FormControl('', [Validators.required]),
            week: new FormControl('', [Validators.required]),
            range: new FormControl('', [Validators.required]),
        });
    }

    /**
     * set default type
     */
    setTypeDefaultValue(): void
    {
        this.bookingForm.get('type').patchValue('0', { emitEvent: false });

        this.bookingForm.get('type').markAsTouched();

        setTimeout(() => this.bookingForm.get('type').updateValueAndValidity());
    }

    /**
     * validate on type change [date|week]
     *
     * @param {*} value
     */
    onTypeChange(value: any): void
    {
        // clear validation
        this.bookingForm.get('date').clearValidators();
        this.bookingForm.get('date').patchValue(null, { emitEvent: false });

        this.bookingForm.get('week').clearValidators();
        this.bookingForm.get('week').patchValue(null, { emitEvent: false });

        this.bookingForm.get('range').clearValidators();
        this.bookingForm.get('range').patchValue(null, { emitEvent: false });

        if(value === '0')
        {
            this.bookingForm.get('date').setValidators([Validators.required]);
            this.bookingForm.get('date').updateValueAndValidity();
        }
        else if(value === '1')
        {
            this.bookingForm.get('week').setValidators([Validators.required]);
            this.bookingForm.get('week').updateValueAndValidity();
        }
        else
        {
            this.bookingForm.get('range').setValidators([Validators.required]);
            this.bookingForm.get('range').updateValueAndValidity();
        }

        this._cdr.markForCheck();
    }

    /*--------------------------------------------------------*/

    /**
     * get preview label
     *
     * @returns {{ start :string, end: string }}
     */
    getPreviewLabel(): { start :string, end: string }
    {
        let start = null;
        let end = null;

        switch (this.fc.type.value) 
        {
            case '0':
                start = DateTimeHelper.getUtcDate(this.fc.date.value);
                break;

            case '1':
                start = DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format('YYYY-MM-DD');
                end = DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format('YYYY-MM-DD');
                break;
        
            default:
                start = DateTimeHelper.getUtcDate(_.head(this.fc.range.value));
                end = DateTimeHelper.getUtcDate(_.last(this.fc.range.value));
                break;
        }

        return {
            start: start,
            end: end
        }
    }

    /**
     * preview attendance dates
     *
     * @param {MouseEvent} e
     */
    previewSlots(e: MouseEvent): void
    {
        e.preventDefault();

        const sendObj: { reference: any, start: string, end: string } = {
            reference: this.children.map(i => i.id),
            start: null,
            end: null
        };

        if(this.fc.type.value === '0')
        {
            sendObj['start'] = DateTimeHelper.getUtcDate(this.fc.date.value);
        }
        else if(this.fc.type.value === '1')
        {
            sendObj['start'] = DateTimeHelper.parseMoment(this.fc.week.value).startOf('isoWeek').format('YYYY-MM-DD');
            sendObj['end'] = DateTimeHelper.parseMoment(this.fc.week.value).endOf('isoWeek').format('YYYY-MM-DD');
        }
        else
        {
            sendObj['start'] = DateTimeHelper.parseMoment(_.head(this.fc.range.value)).format('YYYY-MM-DD');
            sendObj['end'] = DateTimeHelper.parseMoment(_.last(this.fc.range.value)).format('YYYY-MM-DD');
        }

        this._logger.debug('[preview booking request]', sendObj);

        this.buttonLoader = true;

        this._bookingService
            .getBulkAttendancePreview(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => 
                {
                    this.buttonLoader = false; 

                    this._cdr.markForCheck();
                }, 200))
            )
            .subscribe(
                response =>
                {
                    if (_.isEmpty(response)) { return; }

                    this.previewData = response;
                
                    this.preview = true;

                    setTimeout(() =>
                    {
                        this._cdr.markForCheck();

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

        this.preview = false;
    
        this.previewData = [];
        this.previewBatchUpdateErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;
        
        this.buttonSaveLoader = false;

        this.updateScroll();

        this._cdr.markForCheck();
    }

    /**
     * check if preview list is updated
     *
     * @returns {boolean}
     */
    isFormUpdated(): boolean
    {
        return this.getUpdatedItems().length > 0;
    }

    /**
     * get updated bookings
     *
     * @returns {Booking[]}
     */
    getUpdatedItems(): Booking[]
    {
        return this.previewData.filter(i => i.isSelected);
    }

    /**
     * update ui
     *
     * @param {*} time
     * @param {Booking} booking
     * @param {string} type
     * @returns {void}
     */
    onPickerChange(time: any, booking: Booking, type: string): void
    {
        if(_.isNull(time))
        {
            return;
        }

        const index = this.previewData.findIndex(i => i.id === booking.id);

        if (index > -1)
        {
            const attendanceObject = this.previewData[index];

            if (!_.isNull(time))
            {
                if (type === '0')
                {
                    attendanceObject.holdAttendanceStartTime = time;
                }
    
                if (type === '1')
                {
                    attendanceObject.holdAttendanceEndTime = time;
                }
            }

            // set as selected
            attendanceObject.isSelected = !_.isNull(attendanceObject.holdAttendanceStartTime) || !_.isNull(attendanceObject.holdAttendanceEndTime);

            // update ui
            if (_.isNull(attendanceObject.attendance))
            {
                const attendObj = new Attendance({
                    type: '0',
                    check_in_time: attendanceObject.holdAttendanceStartTime,
                    check_out_time: attendanceObject.holdAttendanceEndTime
                });

                if (_.isNull(time))
                {
                    if (type === '0')
                    {
                        attendObj.checkInTime = null;
                    }
    
                    if (type === '1')
                    {
                        attendObj.checkOutTime = null;
                    }
                }

                attendanceObject.attendance = attendObj;
            }
            else
            {
                if (type === '0')
                {
                    attendanceObject.attendance.checkInTime = _.isNull(time) ? null : attendanceObject.holdAttendanceStartTime;
                }

                if (type === '1')
                {
                    attendanceObject.attendance.checkOutTime = _.isNull(time) ? null : attendanceObject.holdAttendanceEndTime;
                }
            }

            // update list
            this.previewData[index] = attendanceObject;
    
            this._cdr.markForCheck();
        }
    }

    /**
     * clear picker value
     *
     * @param {MouseEvent} e
     * @param {Booking} booking
     * @param {string} type
     */
    onPickerClear(e: MouseEvent, booking: Booking, type: string): void
    {
        e.preventDefault();

        const index = this.previewData.findIndex(i => i.id === booking.id);

        if (index > -1)
        {
            const attendanceObject = this.previewData[index];

            if (type === '0')
            {
                attendanceObject.holdAttendanceStartTime = null;

                attendanceObject.attendance.checkInTime = null;
            }
    
            if (type === '1')
            {
                attendanceObject.holdAttendanceEndTime = null;

                attendanceObject.attendance.checkOutTime = null;
            }

            attendanceObject.isSelected = !(_.isNull(attendanceObject.holdAttendanceEndTime) && _.isNull(attendanceObject.holdAttendanceEndTime));

            // update list
            this.previewData[index] = attendanceObject;

            this._cdr.markForCheck();
        }
    }

    /**
     * update attendance time
     *
     * @param {MouseEvent} e
     * @param {Booking} item
     */
    setAttendance(e: MouseEvent, item: Booking, type: string): void
    {
        e.preventDefault();

        (<HTMLElement> (<HTMLElement> this.timePickers.find(i => i.nativeElement.id === `${item.attrId}-${type}`).nativeElement).querySelector('.ant-picker-input')).click();

        return;
    }

    /**
     * set attendance time bulk action
     *
     * @param {MouseEvent} e
     */
    bulkUpdateAction(e: MouseEvent): void
    {
        e.preventDefault();

        this.setAttendanceModal = this._modalService
            .create({
                nzTitle: 'Set Attendance',
                nzContent: SetAttendanceTimeComponent,
                nzMaskClosable: false,
                nzWrapClassName: 'set-attendance-time-modal',
                nzFooter: [
                    {
                        label: 'APPLY',
                        type: 'primary',
                        disabled: componentInstance => !(componentInstance!.setAttendanceForm.valid),
                        onClick: componentInstance =>
                        {
                            this.previewData.forEach(i => 
                                {
                                    i.holdAttendanceStartTime = componentInstance.getValue().start;
                                    i.holdAttendanceEndTime = componentInstance.getValue().end;

                                    const attendObj = new Attendance({
                                        type: '0',
                                        check_in_time: (!_.isNull(componentInstance.getValue().start)) ? componentInstance.getValue().start : null,
                                        check_out_time: (!_.isNull(componentInstance.getValue().end)) ? componentInstance.getValue().end : null,
                                    });

                                    i.attendance = attendObj;

                                    i.isSelected = true;
                                });

                            this._cdr.markForCheck();
   
                            this.setAttendanceModal.destroy();
                        }
                    },
                    {
                        label: 'CLOSE',
                        type: 'danger',
                        onClick: () => this.setAttendanceModal.destroy()
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

        this.preview = false;
        this.previewData = [];
        this.attendanceData = [];
        this.previewBatchUpdateErrorStatus = '';
        this.isAllPreviewDataChecked = false;
        this.isPreviewIndeterminate = false;

        this.setTypeDefaultValue();

        this._cdr.markForCheck();
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.bookingForm.invalid || !this.isFormUpdated()) 
        {
            return;
        }

        // reset
        this.attendanceData = [];

        // format data
        for (const item of this.getUpdatedItems())
        {
            this.attendanceData.push({
                date: item.date,
                child: item.child.id,
                booking: item.id,
                isNew: item.isNew,
                checkInTime: item.holdAttendanceStartTime,
                checkInUser:  !item.isNew && item.attendance ? item.attendance.checkInUser.id : this._authService.currentUserValue.id,
                checkOutTime: item.holdAttendanceEndTime,
                checkOutUser:  this._authService.currentUserValue.id
            });
        }

        this._logger.debug('[submit master roll bookings]', this.attendanceData);

        this.buttonSaveLoader = true;

        this._bookingService
            .updateBulkAttendance({ slots: this.attendanceData })
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => 
                { 
                    this.buttonSaveLoader = false; 

                    this._cdr.markForCheck();
                })
            )
            .subscribe(
                res => setTimeout(() => this.matDialogRef.close(res), 250),
                error =>
                {
                    throw error;
                }
            );
    }

}

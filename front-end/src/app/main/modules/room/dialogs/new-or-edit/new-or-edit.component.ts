import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { FormControl, FormGroup, Validators, FormArray, ValidatorFn } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { helpMotion } from 'ng-zorro-antd';

import { NotificationService } from 'app/shared/service/notification.service';

import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';

import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import { Branch } from 'app/main/modules/branch/branch.model';
import { Room } from '../../models/room.model';
import { RoomService } from '../../services/room.service';
import { CommonService } from 'app/shared/service/common.service';
import { valueExists } from 'app/shared/validators/asynValidator';
import { NotifyMessageType } from 'app/shared/enum/notify-message.enum';
import { User } from 'app/main/modules/user/user.model';
import {differenceInCalendarDays} from 'date-fns';
import {DateTimeHelper} from '../../../../../utils/date-time.helper';
import * as moment from 'moment';



@Component({
    selector: 'app-new-or-edit',
    templateUrl: './new-or-edit.component.html',
    styleUrls: ['./new-or-edit.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 1000 }),
        fadeOutOnLeaveAnimation({ duration: 2000 })
    ]
})
export class NewOrEditComponent implements OnInit, OnDestroy
{
    private _unsubscribeAll: Subject<any>;

    action: string;
    dialogTitle: string;
    roomForm: FormGroup;
    editMode = false;
    buttonLoader = false;
    rooms: Room[];
    brachList: Branch;
    showAlert = false;
    staffList: User[];
    selectedStaffId: any;
    size: any = 'large';
    roomAdminOnly : boolean;

    /* table */
    tableLoading: boolean;
    Capacity: any[];
    total: number;


    /**
       * Constructor
       *
       * @param {MatDialogRef<NewOrEditComponent>} matDialogRef
       * @param {NGXLogger} _logger
       * @param {NotificationService} _notification
       * @param {RoomService} _roomService
       * @param _data
       */
    constructor(
        public matDialogRef: MatDialogRef<NewOrEditComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _roomService: RoomService,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._logger.debug('[room data]', _data);
        this._unsubscribeAll = new Subject();
        this.showAlert = false;
        this.action = _data.action;
        this.rooms = _data.response.roomRes;
        this.staffList = _data.response.depends.staffList;
        this.roomAdminOnly = false;
        // table
        this.tableLoading = false;

        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Room';
            this.editMode = (_data.response && _data.response.roomRes);
            this.editMode = true;
            this.selectedStaffId = _.map(_data.response.roomRes.staff, (i) => i.id);
        }
        else {
            this.dialogTitle = 'New Room';
        }

        this.createRoomForm();


    }

    ngOnInit(): void {
        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.Capacity = this._data.response.roomRes.capacity;
            this.total = this._data.response.roomRes.capacityCount;
            this.roomAdminOnly = this._data.response.roomRes.adminOnly;
        }
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get fc(): any {
        return this.roomForm.controls;
    }

    createRoomForm(): void {
        this.roomForm = new FormGroup({
            title: new FormControl(this.editMode ? this._data.response.roomRes.title : '', [Validators.required, Validators.minLength(3)]),
            desc: new FormControl(this.editMode ? this._data.response.roomRes.desc : '', [Validators.required, Validators.maxLength(250), Validators.minLength(4)]),
            status: new FormControl(this.editMode ? this._data.response.roomRes.status : true),
            adminOnly: new FormControl(this.editMode ? this._data.response.roomRes.adminOnly : false),
            staff: new FormControl(this.editMode ? this.selectedStaffId : null, [Validators.required]),
            startTime: new FormControl(this.editMode ? (this._data.response.roomRes.startTime) ? this.convertToTime(this._data.response.roomRes.startTime) : null : null),
            endTime: new FormControl(this.editMode ? (this._data.response.roomRes.endTime) ?  this.convertToTime(this._data.response.roomRes.endTime) : null : null),
            childrenPerEducator: new FormControl(this.editMode ? (this._data.response.roomRes.staffRatio) ? this._data.response.roomRes.staffRatio : null : null),
            capacity: new FormControl( null),
            effectiveDate: new FormControl( null),
        });
        setTimeout(() => {
            this.roomForm.get('title').setAsyncValidators([valueExists(this._commonService, 'room.name', this.editMode ? this._data.response.roomRes.id : '')]);
        }, 100);
    }

    resetForm(e: MouseEvent): void {
        if (e) { e.preventDefault(); }
        this.roomForm.reset();

        for (const key in this.fc) {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }
    }

    getUtcTime12Hr(value: any): string
    {
        if (value === '')
        {
            return null;
        }

        return moment(value).format('H:mm');
    }

    convertToTime(value: any): Date
    {
        return new Date(null, null, null, value.split(':')[0], value.split(':')[1]);
    }

    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.roomForm.invalid) {
            return;
        }
        const sendObj = {
            title: this.fc.title.value,
            staff: this.fc.staff.value,
            desc: this.fc.desc.value,
            status: this.editMode ? this.fc.status.value : true,
            admin_only: this.fc.adminOnly.value,
            startTime: (this.fc.startTime.value) ? this.getUtcTime12Hr(this.fc.startTime.value) : null,
            endTime: (this.fc.endTime.value) ? this.getUtcTime12Hr(this.fc.endTime.value) : null,
            childrenPerEducator: this.fc.childrenPerEducator.value,
            capacity: this.fc.capacity.value,
            effectiveDate: (this.fc.effectiveDate.value)? DateTimeHelper.getUtcDate(this.fc.effectiveDate.value) : DateTimeHelper.getUtcDate(new Date()),
        };

        if (this.editMode) { sendObj['id'] = this._data.response.roomRes.id; }

        this._logger.debug('[room object]', sendObj);

        this.buttonLoader = true;

        this._roomService[this.editMode ? 'updateRoom' : 'storeRoom'](sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => {
                    this.buttonLoader = false;

                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res), 250);
                },
                error => {
                    this.buttonLoader = false;

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    // isBranchSelected(): boolean {
    //     return this.roomForm.get('branch').hasError('required')&&this.roomForm.get('branch').touched;
    // }

    /* add room capacity */
    addCapacity(e: MouseEvent): void
    {
        e.preventDefault();
        if(!this.fc.capacity.value)
        {
            this._notification.displaySnackBar('Please select a capacity', NotifyType.WARNING)
            return;
        }
        if (this.roomForm.invalid) {
            return;
        }
        const sendObj = {
            capacity: this.fc.capacity.value,
            effectiveDate: (this.fc.effectiveDate.value)? DateTimeHelper.getUtcDate(this.fc.effectiveDate.value) : DateTimeHelper.getUtcDate(new Date()),
        };

        if (this.editMode) { sendObj['id'] = this._data.response.roomRes.id; }

        this._logger.debug('[room object]', sendObj);

        this.buttonLoader = true;

        this._roomService.addCapacity(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => {
                    this.buttonLoader = false;
                    this.Capacity = res;
                    this.roomForm.get('capacity').patchValue(null, { emitEvent: false });
                    this.roomForm.get('effectiveDate').patchValue(null, { emitEvent: false });

                },
                error => {
                    this.buttonLoader = false;
                    this.roomForm.get('capacity').patchValue(null, { emitEvent: false });
                    this.roomForm.get('effectiveDate').patchValue(null, { emitEvent: false });
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }


    isStaffSelected(): boolean {
        return this.roomForm.get('staff').hasError('required') && this.roomForm.get('staff').touched;
    }
    disabledPastDates = (current: Date): boolean => {
        return differenceInCalendarDays(current, new Date()) < 0;
    }


    adminOnlyToggle(e: boolean): void
    {
        this.roomAdminOnly = e;
    }




}

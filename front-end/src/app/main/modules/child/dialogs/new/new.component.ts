import { Component, OnInit, ViewEncapsulation, Inject, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';

import { NotificationService } from 'app/shared/service/notification.service';
import { CommonService } from 'app/shared/service/common.service';
import { ChildrenService } from '../../services/children.service';

import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';

import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'child-new',
    templateUrl: './new.component.html',
    styleUrls: ['./new.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ChildAddDialogComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    childForm: FormGroup;
    buttonLoader: boolean;

    attendanceList: any;
    allChecked: boolean;
    indeterminate: boolean;
    attendanceFormStatus: string;

    /**
     * Constructor
     *
     * @param {MatDialogRef<ChildAddDialogComponent>} matDialogRef
     * @param {RoleService} _roleService
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {CommonService} _commonService
     * @param {ChildrenService} _childrenService
     * @param {Router} _router
     * @param _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ChildAddDialogComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _childrenService: ChildrenService,
        private _router: Router,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        this._logger.debug('[child data]', _data);

        // Set the defaults
        this.buttonLoader = false;
        this.dialogTitle = 'Create New Profile';
        this.attendanceList = this._commonService.getWeekDays();
        this.allChecked = false;
        this.indeterminate = false;
        this.attendanceFormStatus = '';

        this.childForm = this.createChildForm();

        this.addAttendanceCheckbox();

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
        this._logger.debug('child add/edit view !!!');
        
        this.onChanges();
    }

    /**
     * On change
     */
    onChanges(): void
    {
        this.childForm
            .get('attendance')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this.updateSingleChecked());
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
        return this.childForm.controls; 
    }

    /**
     * disable future dates
     */
    disabledDate = (current: Date): boolean =>
    {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createChildForm(): FormGroup
    {
        return new FormGroup({
            f_name: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z 0-9_)(-]+$'), Validators.maxLength(150)]),
            m_name: new FormControl('', [Validators.maxLength(150), Validators.pattern('^[a-zA-Z 0-9_)(-]+$')]),
            l_name: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z 0-9_)(-]+$'), Validators.maxLength(150)]),
            gender: new FormControl(null, [Validators.required]),
            desc: new FormControl('', [Validators.maxLength(500)]),
            date_of_birth: new FormControl('', [Validators.required]),
            join_date: new FormControl('', [Validators.required]),
            status: new FormControl('1', [Validators.required]),
            nappy: new FormControl(false),
            bottle_feed: new FormControl(false),
            attendance: new FormArray([], minSelectedCheckboxes()),
            continue_edit: new FormControl(false)
        });
    }

    /**
     * add attendance to form array
     */
    addAttendanceCheckbox(): void
    {
        this.attendanceList.forEach((v: any, i: number) =>
        {   
            const control = new FormControl(false);
            (this.fc.attendance as FormArray).push(control);
        });
    }

    /**
     * check if attendance selection has error
     */
    hasAttendanceFormError(): void
    {
        this.attendanceFormStatus = (this.childForm.get('attendance').hasError('required') && this.childForm.get('attendance').touched) ? 'error' : '';
    }

    /**
     * update all attendance items
     */
    updateAllChecked(): void
    {
        this.indeterminate = false;
        
        this.fc.attendance
            .patchValue(this.fc.attendance.value.map(() => this.allChecked), { emitEvent: false });
        
        this.fc.attendance.markAllAsTouched();

        this.hasAttendanceFormError();
    }

    /**
     * update single attendance item
     */
    updateSingleChecked(): void
    {
        if (this.fc.attendance.value.every(item => item === false))
        {
            this.allChecked = false;
            this.indeterminate = false;
        }
        else if (this.fc.attendance.value.every(item => item === true))
        {
            this.allChecked = true;
            this.indeterminate = false;
        }
        else
        {
            this.indeterminate = true;
        }

        this.hasAttendanceFormError();
    }

    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.childForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

        this.attendanceFormStatus = '';
        this.allChecked = false;
        this.indeterminate = false;
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.childForm.invalid) 
        {
            return;
        }

        const selectedAttendance = this.childForm.value.attendance
            .map((v: any, i: string | number) => v ? this.attendanceList[i] : null)
            .filter((v: any) => v !== null)
            .map((v: { index: any; }) => v.index);

        const sendObj = {
            f_name: this.fc.f_name.value,
            m_name: this.fc.m_name.value,
            l_name: this.fc.l_name.value,
            gender: this.fc.gender.value,
            desc: this.fc.desc.value,
            attendance: selectedAttendance,
            dob: DateTimeHelper.getUtcDate(this.fc.date_of_birth.value),
            join_date: DateTimeHelper.getUtcDate(this.fc.join_date.value),
            status: this.fc.status.value,
            nappy: this.fc.nappy.value,
            bottle_feed: this.fc.bottle_feed.value
        };

        this._logger.debug('[child object]', sendObj);

        this.buttonLoader = true;

        this._childrenService
            .storeChild(sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res =>
                {
                    this.buttonLoader = false;

                    if (this.fc.continue_edit.value)
                    {
                        this._router.navigateByUrl(`manage-children/child/${res.data}`);
                    }

                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res.message), 250);
                },
                error =>
                {
                    this.buttonLoader = false;

                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }
}

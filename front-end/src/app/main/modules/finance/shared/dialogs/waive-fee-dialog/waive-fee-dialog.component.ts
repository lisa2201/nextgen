import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { User } from 'app/main/modules/user/user.model';
import { fadeMotion, helpMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { FinanceService } from '../../services/finance.service';

import * as _ from 'lodash';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { minSelectedCheckboxes } from 'app/shared/validators/minSelectedCheckboxes';
import { CommonService } from 'app/shared/service/common.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Child } from 'app/main/modules/child/child.model';
import { WaiveTransactionDetailDialogComponent } from './waive-transaction-detail-dialog/waive-transaction-detail-dialog.component';

@Component({
    selector: 'app-waive-fee-dialog',
    templateUrl: './waive-fee-dialog.component.html',
    styleUrls: ['./waive-fee-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class WaiveFeeDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    waiveFeeForm: FormGroup;
    buttonLoading: boolean;
    parents: User[];
    items: [];
    preSelectedParents: string[];
    weekDays: any;
    preview: boolean;
    previewData: any;
    previewWeekDays: string;

    isPreviewIndeterminate: boolean;
    isAllPreviewDataChecked: boolean;
    previewDataError: string;
    showDays: boolean;

    constructor(
        public matDialogRef: MatDialogRef<WaiveFeeDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _logger: NGXLogger,
        private _financialService: FinanceService,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _matDialog: MatDialog
    ) {

        this.unsubscribeAll = new Subject();
        this.parents = this._data.parents ? this._data.parents : [];
        this.preSelectedParents = this._data.selected_parents ? this._data.selected_parents : [];
        this.items = this._data.items ? this._data.items : [];
        this.buttonLoading = false;
        this.preview = false;
        this.weekDays = this._commonService.getWeekDays();
        this.previewData = [];
        this.previewDataError = '';
        this.previewWeekDays = '';
        this.showDays = true;

        this.createForm();
        this.setSelectedParents();
        this.addWeekDaysCheckbox();
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('[Waive-Fee-dialog]');

        this.waiveFeeForm.get('start_date')
            .valueChanges
            .pipe(
                takeUntil(this.unsubscribeAll)
            )
            .subscribe((value) => {
                this.handleStartDateChange(value);
            });

    }

    /**
    * On destroy
    */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * Create form
     */
    createForm(): void {

        this.waiveFeeForm = this._formBuilder.group({
            parents: new FormControl(null, [Validators.required]),
            start_date: new FormControl(null, [Validators.required]),
            end_date: new FormControl(null, [Validators.required]),
            days: new FormArray([], minSelectedCheckboxes())
        });

    }

    get fc(): any {
        return this.waiveFeeForm.controls;
    }

    setSelectedParents(): void {

        if (this.preSelectedParents.length > 0) {
            this.waiveFeeForm.get('parents').patchValue(this.preSelectedParents);
        }

    }

    handleStartDateChange(value: any): void {

        if (value) {

            const weekStartDate = DateTimeHelper.now().startOf('isoWeek');

            const daysArr = this.fc.days as FormArray;

            if (DateTimeHelper.parseMoment(value).isBefore(weekStartDate)) {

                for (let ctl of daysArr.controls) {
                    ctl.patchValue(true);
                }

                this.showDays = false;

            } else {

                for (let ctl of daysArr.controls) {
                    ctl.patchValue(false);
                }

                this.showDays = true;

            }

        }

    }

    addWeekDaysCheckbox(): void
    {
        this.weekDays.forEach((v: any, i: number) =>
        {   
            const control = new FormControl(false);
            (this.fc.days as FormArray).push(control);
        });
    }

    validDateRange(): boolean {

        const start = DateTimeHelper.parseMoment(this.fc.start_date.value);
        const end = DateTimeHelper.parseMoment(this.fc.end_date.value);

        if (start.isAfter(end)) {
            this._notification.displaySnackBar('Please select valid date range', NotifyType.ERROR);
            return false;
        } else {
            return true;
        }

    }

    getPreviewData(event: MouseEvent): void {

        event.preventDefault();

        if (this.waiveFeeForm.invalid || !this.validDateRange()) {
            return;
        }

        const sendObj = {
            parents: this.fc.parents.value,
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            days: this.fc.days.value
        };

        this._logger.debug('[previewRequest]', sendObj);

        this.buttonLoading = true;

        this._financialService.getWaiveFeePreviewData(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {

                if (_.isEmpty(response)) {
                    this._notification.displaySnackBar('No records found for adjustment', NotifyType.ERROR);
                    return;
                }

                this.preview = true;
                this.previewData = response;
                this.getPreviewDays();
                this.refreshPreviewStatus();

            });

    }

    toggleSelectAllParents(value: boolean): void {

        if (value === true) {
            this.waiveFeeForm.get('parents').patchValue(_.map(this.parents, 'id'), { emitEvent: false });
        } else {
            this.waiveFeeForm.get('parents').patchValue([], { emitEvent: false });
        }

    }

    closePreview(): void {
        this.preview = false;
        this.previewData = [];
    }

    getStartDate(): string {
        return DateTimeHelper.getUtcDate(this.fc.start_date.value);
    }

    getEndDate(): string {
        return DateTimeHelper.getUtcDate(this.fc.end_date.value);
    }

    checkAllPreviews(value: boolean): void {

        if (_.isEmpty(this.previewData)) {
            return;
        }

        this.previewData.forEach((i) => {
            i.selected = value;
            i.child.forEach((v) => {
                v.selected = value;
            });
        });
        
        this.refreshChildStatus();
        this.refreshPreviewStatus();

    }

    getPreviewDays(): void {

        const arr = this.fc.days.value;

        const days = [];

        _.forEach(arr, (val, idx) => {
            if (val === true) {
                days.push(DateTimeHelper.now().isoWeekday(idx).format('dd'));
            }
        });

        this.previewWeekDays = _.join(days, '-');

    }

    checkParent(value: boolean, data: any): void {
        data.selected = value;
        data.child.forEach((i) => {
            i.selected = value;
        });

        this.refreshChildStatus();
        this.refreshPreviewStatus();

    }

    refreshPreviewStatus(): void {
        this.isAllPreviewDataChecked = this.previewData.every((i: { selected: boolean; }) => i.selected);
        this.isPreviewIndeterminate = (this.previewData.some(i => i.selected) || this.previewData.some(i => i.child_intermediate_checked)) && !this.isAllPreviewDataChecked;
        this.previewDataError = !this.hasSelectedPreviewItems() ? 'error' : '';
        
    }

    checkChild(value: boolean): void {

        this.refreshChildStatus();
        this.refreshPreviewStatus();

    }

    refreshChildStatus(): void {

        this.previewData.forEach((val: any) => {
            val.child_all_checked = val.child.every((i: { selected: boolean }) => i.selected);
            val.child_intermediate_checked = val.child.some(i => i.selected) && !val.child_all_checked;
            val.selected = val.child_all_checked;
        });
    
    }

    getFullname(data: any): string {
        return `${data.first_name} ${data.last_name}`;
    }

    getTransactionType(data: any): string {
        if (data.transaction_type === 'fee') {
            return 'Booking Fee';
        } else if (data.transaction_type === 'subsidy_estimate') {
            return 'Subsidy Estimate';
        } else {
            return '';
        }
    }

    getSelectedPreviewItems(): any {
        return this.previewData.filter((val: {selected: boolean, child_intermediate_checked: boolean}) => val.selected || val.child_intermediate_checked);
    }

    getSelectedUsersNumber(): number {
        return this.getSelectedPreviewItems().length;
    }

    hasSelectedPreviewItems(): boolean {
        return this.getSelectedPreviewItems().length > 0;
    }

    getParentGapFee(data: any): number {
        return _.sum(_.map(data.child.filter((val: {selected: boolean}) => val.selected), 'gap_fee'));
    }

    openDetails(event: MouseEvent, child: any): void {

        event.preventDefault();

        this._matDialog
            .open(WaiveTransactionDetailDialogComponent,
                {
                    panelClass: 'financial-payment-waive-transaction-details-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {},
                        child: child
                    }
                });

    }

    submit(event: MouseEvent): void {

        event.preventDefault();

        if (this.waiveFeeForm.invalid || !this.validDateRange()) {
            return;
        }

        const parent_ids = _.map(_.filter(this.previewData, (v: any) => v.selected || v.child_intermediate_checked), 'index');
        const child_ids = _.map(_.filter(_.flatten(_.map(this.previewData, 'child')), (v: any) => v.selected), 'index');

        const sendObj = {
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            days: this.fc.days.value,
            parent_ids: parent_ids,
            child_ids: child_ids
        };

        this._logger.debug('[submitData]', sendObj);

        this.buttonLoading = true;

        this._financialService.getWaiveFeeAdjust(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {

                if (response) {
                    this._notification.displaySnackBar(response, NotifyType.SUCCESS);
                }

                setTimeout(() => this.matDialogRef.close(response), 250);

            });

    }

    disabledStartDate = (currentDate: Date): boolean => {
        return currentDate.getDay() === 1 ? false : true;
    }

    disabledEndDate = (currentDate: Date): boolean => {
        const currentDayAfterStart = DateTimeHelper.parseMoment(this.fc.start_date.value).isBefore(DateTimeHelper.parseMoment(currentDate));
        return currentDate.getDay() === 0 && currentDayAfterStart  ? false : true;
    }
}

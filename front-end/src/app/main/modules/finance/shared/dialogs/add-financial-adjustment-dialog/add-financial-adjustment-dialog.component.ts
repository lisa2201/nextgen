import { Component, OnInit, OnDestroy, Inject, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonService } from 'app/shared/service/common.service';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Child } from 'app/main/modules/child/child.model';
import { Room } from 'app/main/modules/room/models/room.model';
import { debounce, debounceTime, finalize, takeUntil } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { FinanceService } from '../../services/finance.service';

@Component({
    selector: 'app-add-financial-adjustment-dialog',
    templateUrl: './add-financial-adjustment-dialog.component.html',
    styleUrls: ['./add-financial-adjustment-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class AddFinancialAdjustmentDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    adjustmentForm: FormGroup;
    buttonLoading: boolean;
    children: Child[];
    rooms: Room[];
    items: [];
    loadingChildren: boolean;
    singleParentMode: boolean;
    showInfoAlert: boolean;
    parentId: string | null;

    listOfSelectedValue;

    constructor(
        public matDialogRef: MatDialogRef<AddFinancialAdjustmentDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _logger: NGXLogger,
        private _financialService: FinanceService
    ) {

        this.unsubscribeAll = new Subject();
        this.rooms = _data.rooms;
        this.children = _data.children ? _data.children : [];
        this.singleParentMode = _data.singleParent ? true : false;
        this.parentId = this.singleParentMode ? _data.parentId: null;
        this.items = _data.items;
        this.buttonLoading = false;
        this.showInfoAlert = false;

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.createForm();
        this.setDateChangeHandle();

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

    /**
     * Create form
     */
    createForm(): void {

        this.adjustmentForm = this._formBuilder.group({
            rooms: new FormControl(null),
            children: new FormControl(null, [Validators.required]),
            date: new FormControl('', [Validators.required]),
            item: new FormControl(null, [Validators.required]),
            type: new FormControl(null, [Validators.required]),
            amount: new FormControl('', [Validators.required, Validators.min(0)]),
            comments: new FormControl(''),
            scheduled: new FormControl(false),
            inactive_children: new FormControl(false)
        });

        this.adjustmentForm.get('scheduled').disable();

        if (!this.singleParentMode) {

            this.adjustmentForm.get('rooms').valueChanges
                .pipe(
                    debounceTime(1000)
                )
                .subscribe((value) => {

                    this.loadChildren(value, true);

                });

        }

        this.adjustmentForm.get('inactive_children').valueChanges
            .pipe(
                debounceTime(200)
            )
            .subscribe((value) => {

                if (this.singleParentMode) {
                    this.loadChildren(this.parentId, false);
                } else {
                    this.loadChildren(this.adjustmentForm.get('rooms').value, true);
                }

            });


    }

    get fc(): any {
        return this.adjustmentForm.controls;
    }

    loadChildren(value: any, room: boolean): void {

        const childrenControl = this.adjustmentForm.get('children');
        const inactiveChildren = this.adjustmentForm.get('inactive_children').value;

        childrenControl.disable();

        if (_.isEmpty(value)) {
            childrenControl.reset();
            return;
        }

        this.loadingChildren = true;

        this._financialService
            .getFinancialAdjustmentChildrenList((room === true ? value : null), (room === false ? value : null), inactiveChildren)
            .pipe(
                finalize(() => {
                    this.loadingChildren = false;
                    childrenControl.enable();
                    childrenControl.reset();
                })
            )
            .subscribe((response) => {
                this.children = response;
            });

    }

    setDateChangeHandle(): void {

        const date = this.adjustmentForm.get('date');
        const scheduled = this.adjustmentForm.get('scheduled');

        date.valueChanges
            .pipe(
                takeUntil(this.unsubscribeAll)
            )
            .subscribe((value: Date) => {

                if (value) {
                    
                    if (DateTimeHelper.parseMoment(value).isSameOrBefore(DateTimeHelper.now(), 'day')) {
                        scheduled.patchValue(false, {emitEvent: false});
                        scheduled.disable();
                    } else {
                        scheduled.enable();
                    }
    
                    if (DateTimeHelper.parseMoment(value).isBefore(DateTimeHelper.now(), 'day')) {
                        this.showInfoAlert = true;
                    } else {
                        this.showInfoAlert = false;
                    }

                }

            });

    }

    onSubmit(): void {

        if (this.adjustmentForm.invalid) {
            return;
        }

        this.buttonLoading = true;

        const sendObj = {
            children: this.fc.children.value,
            type: this.fc.type.value,
            item: this.fc.item.value,
            date: DateTimeHelper.getUtcDate(this.fc.date.value),
            amount: this.fc.amount.value,
            comments: this.fc.comments.value,
            scheduled: this.fc.scheduled.value
        };

        this._financialService.addFinancialAdjustment(sendObj)
            .pipe(
                takeUntil(this.unsubscribeAll),
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe((response) => {

                setTimeout(() => this.matDialogRef.close(response), 250);

            });

    }

    toggleSelectAllChildren(value: boolean): void {

        if (value === true) {
            this.adjustmentForm.get('children').patchValue(_.map(this.children, 'id'), { emitEvent: false });
        } else {
            this.adjustmentForm.get('children').patchValue([], { emitEvent: false });
        }

    }

    toggleSelectAllRooms(value: boolean): void {

        if (value === true) {
            this.adjustmentForm.get('rooms').patchValue(_.map(this.rooms, 'id'), { emitEvent: false });
            this.loadChildren(_.map(this.rooms, 'id'), true);
        } else {
            this.adjustmentForm.get('rooms').patchValue([], { emitEvent: false });
            this.loadChildren([], true);
        }

    }

}

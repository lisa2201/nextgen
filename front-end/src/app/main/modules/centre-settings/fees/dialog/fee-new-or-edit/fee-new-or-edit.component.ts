import { AuthService } from 'app/shared/service/auth.service';
import { Component, OnInit, ViewEncapsulation, Inject, OnDestroy, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { CommonService } from 'app/shared/service/common.service';
import { FeesService } from '../../service/fees.service';
import { takeUntil, finalize, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Fee } from '../../model/fee.model';
import { AppConst } from 'app/shared/AppConst';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { fuseAnimations } from '@fuse/animations';
import { fadeMotion } from 'ng-zorro-antd';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Room } from 'app/main/modules/room/models/room.model';
import * as _ from 'lodash';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AuthClient } from 'app/shared/model/authClient';
import { AdjustedFee } from '../../model/fee-adjusted.model';

@Component({
    selector: 'fee-new-or-edit',
    templateUrl: './fee-new-or-edit.component.html',
    styleUrls: ['./fee-new-or-edit.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
		fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FeeNewOrEditComponent implements OnInit, OnDestroy {
    
    private _unsubscribeAll: Subject<any>;

    feeType = [
        {
            name: 'Routine',
            index: 0
        },
        {
            name: 'Casual',
            index: 1
        }
    ];

    frequency = [
        {
            name: 'Daily',
            index: 0
        },
        {
            name: 'Hourly',
            index: 1
        }
    ];

    vendor = [
        {
            name: 'Australian CCS',
            index: 0
        },
        {
            name: 'None',
            index: 1
        }
    ];

    action: string;
    client: AuthClient;
    dialogTitle: string;
    fee: Fee[];
    rooms: Room[];
    selectedItem: Fee;
    adjustedList: any[];
    feesForm: FormGroup;
    editMode: boolean;
    isEditable: boolean;
    adjustMode: boolean;
    buttonLoader: boolean;
    showData: boolean;
    confirmModal: NzModalRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<FeeNewOrEditComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {NotificationService} _notification
     * @param {CommonService} _commonService
     * @param {FeesService} _feesService
     * @param {NzModalService} _modalService
     * @param {AuthService} _authService
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<FeeNewOrEditComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _feesService: FeesService,
        private _modalService: NzModalService,
        private _authService: AuthService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        
        this.editMode = false;
        this.adjustMode = false;
        this.buttonLoader = false;
        this.showData = false;
        this.action = this._data.action;
        this.rooms = this._data.rooms;
        this.isEditable = this._data.fee ? this._data.fee.editable : false;
        this.client = this._authService.getClient();

        if (this.action === AppConst.modalActionTypes.EDIT) 
        {
            this.dialogTitle = 'Edit Fee';
            this.editMode = true;
            this.selectedItem = this._data.fee;
        } 
        else if (this.action === 'ADJUST') 
        {
            this.adjustMode = true;
            this.dialogTitle = 'Adjust Fee';
            this.selectedItem = this._data.fee;
        } 
        else if (this.action === 'ShowData') 
        {
            this.showData = true;
            this.adjustedList = this._data.list;
            this.selectedItem = this._data.item;
            this.dialogTitle = 'Adjusted History';
        } 
        else 
        {
            this.dialogTitle = 'New Fee';
        }

        // Set the private defaults
        this._unsubscribeAll = new Subject(); 

        this.createFeesForm();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void 
    {
        this._logger.debug('fee add or edit !!!', this._data);

        if (this.editMode && this._data.fee.frequency === '1')
        {
            this.validateArrangementType(this._data.fee.frequency);
        }

        this.feesForm
            .get('frequency')
            .valueChanges.pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.validateArrangementType(value));

        this.feesForm
            .get('vendor')
            .valueChanges.pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.validateArrangementAmount(value));

    }

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

    get fc(): any 
    {
        return this.feesForm.controls;
    }

    disabledDate = (current: Date): boolean => 
    {
        return differenceInCalendarDays.default(new Date(), current) > 0;
    }

    validateArrangementAmount(value: any): void 
    {
        setTimeout(() => {
            // set validation
            if (value === '1') {
                this.fc.nAmount.clearValidators();
                // this.fc.gAmount.clearValidators();
                this.fc.nAmount.setValidators([
                    Validators.required,
                    Validators.minLength(1),
                    Validators.pattern('^[0-9.]{1,10}$')
                ]);

            } else{
                this.fc.nAmount.setValidators([
                    Validators.required,
                    Validators.minLength(1),
                    Validators.pattern('^[0-9.]{1,10}$')
                ]);
            }

            this.fc.nAmount.updateValueAndValidity();
        }, 50);
    }

    createFeesForm(): void 
    {
        this.feesForm = new FormGroup({
            feeName: new FormControl(
                this.editMode
                    ? { value: this._data.fee.name, disabled: false }
                    : this.adjustMode
                    ? { value: this._data.fee.name, disabled: true }
                    : { value: '', disabled: false },
                [Validators.required, Validators.minLength(3)]
            ),
            feeType: new FormControl(
                this.editMode
                    ? { value: this._data.fee.type, disabled: true }
                    : this.adjustMode
                    ? { value: this._data.fee.type, disabled: true }
                    : { value: null, disabled: false },
                [Validators.required]
            ),
            frequency: new FormControl(
                this.editMode
                    ? { value: this._data.fee.frequency, disabled: true }
                    : this.adjustMode
                    ? { value: this._data.fee.frequency, disabled: true }
                    : { value: null, disabled: false },
                [Validators.required]
            ),
            vendor: new FormControl(
                this.editMode
                    ? { value: this._data.fee.vendor, disabled: true }
                    : this.adjustMode
                    ? { value: this._data.fee.vendor, disabled: true }
                    : { value: null, disabled: false },
                [Validators.required]
            ),
            session_time: new FormControl(
                this.editMode
                    ? { value: this._data.fee.sessionStart && this._data.fee.sessionEnd ? [
                        this._data.fee.sessionStart,
                        this._data.fee.sessionEnd
                    ] : null, disabled: !this.isEditable }
                    : this.adjustMode
                    ? { value: this._data.fee.sessionStart && this._data.fee.sessionEnd ? [
                        this._data.fee.sessionStart,
                        this._data.fee.sessionEnd
                    ] : null, disabled: true }
                    : { value: null, disabled: false },
                [Validators.required]
            ),
            nAmount: new FormControl(
                this.editMode
                    ? { value: this._data.fee.netAmount, disabled: !this.isEditable }
                    : this.adjustMode
                    ? { value: this._data.fee.netAmount, disabled: false }
                    : { value: '', disabled: false },
                    this.adjustMode && this._data.fee.vendor === '1' ? [
                        Validators.required,
                        Validators.minLength(1),
                        Validators.pattern('^[0-9.]{1,10}$')
                    ] : [
                        Validators.required,
                        Validators.minLength(1),
                        Validators.pattern('^[0-9.]{1,10}$')
                    ]
            ),
            // gAmount: new FormControl(
            //     this.editMode
            //         ? { value: this._data.fee.grossAmount, disabled: true }
            //         : this.adjustMode
            //         ? { value: this._data.fee.grossAmount, disabled: false }
            //         : { value: '', disabled: false },
            //         this.adjustMode && this._data.fee.vendor === '1'? [
            //             Validators.required,
            //             Validators.minLength(1),
            //             Validators.pattern('^[0-9.]{1,10}$')
            //         ] : [
            //             Validators.required,
            //             Validators.minLength(1),
            //             Validators.pattern('^[0-9.]{1,10}$')
            //         ]
            // ),
            visible: new FormControl(
                this.editMode
                    ? { value: this._data.fee.visible, disabled: false }
                    : this.adjustMode
                    ? { value: this._data.fee.visible, disabled: true }
                    : { value: '', disabled: false },
                [Validators.required]
            ),
            eDate: new FormControl(
                this.editMode
                    ? { value: '', disabled: true }
                    : this.adjustMode
                    ? { value: '', disabled: false }
                    : { value: '', disabled: true },
                [Validators.required]
            ),
            rooms: new FormControl(
                this.editMode
                    ? { value: this._data.fee.rooms.map((i: { id: string; }) => i.id), disabled: false }
                    : this.adjustMode
                    ? { value: this._data.fee.rooms.map((i: { id: string; }) => i.id), disabled: true }
                    : { value: null, disabled: false },
                []
            ),
            update_future_bookings: new FormControl(
                this.editMode
                    ? { value: false, disabled: true }
                    : this.adjustMode
                    ? { value: false, disabled: false }
                    : { value: false, disabled: true },
                [Validators.required]
            )
        });
    }

    /**
     * validate against arrangement type
     *
     * @param {string} value
     */
    validateArrangementType(value: any): void 
    {
        setTimeout(() => 
        {
            if (value === '1') 
            {
                this.feesForm.get('session_time').disable({ emitEvent: false });
            } 
            else if (value === '0') 
            {
                this.feesForm.get('session_time').enable({ emitEvent: false });
            }
        }, 50);
    }

    checkAdjustedAmountChanged(): boolean
    {
        return this.adjustMode ? (+this.fc.nAmount.value !== +this._data.fee.netAmount) : true;
    }

    onFormSubmit(e: MouseEvent): void 
    {
        e.preventDefault();

        if (this.feesForm.invalid) 
        {
            return;
        }

        const sendObj = {
            name: this.fc.feeName.value,
            type: this.fc.feeType.value,
            frequency: this.fc.frequency.value,
            vendor: this.fc.vendor.value,
            nAmount: _.toString(this.fc.nAmount.value),
            visible: this.fc.visible.value,
            rooms: this.fc.rooms.value
        };

        if (this.fc.frequency.value === '0')
        {
            sendObj['session_start'] = _.head(this.fc.session_time.value);
            sendObj['session_end'] = _.last(this.fc.session_time.value);
        }

        if (this.editMode) 
        {
            sendObj['id'] = this._data.fee.id;
        }

        if (this.adjustMode) 
        {
            sendObj['id'] = this._data.fee.id;
            sendObj['eDate'] = DateTimeHelper.getUtcDate(this.fc.eDate.value);
            sendObj['update_bookings'] = this.fc.update_future_bookings.value;
        }

        this._logger.debug('[fees object]', sendObj);

        this.buttonLoader = true;

        this._feesService[ this.editMode ? 'updateFee' : (this.adjustMode ? 'adjustFee' : 'storeFee') ](sendObj)
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

    resetForm(e: MouseEvent): void 
    {
        if (e) 
        {
            e.preventDefault();
        }

        this.feesForm.reset();

        for (const key in this.fc) 
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }
    }

    removeData(item: AdjustedFee, e: MouseEvent): void 
    {
        e.preventDefault();

        if (!item.editable)
        {
            return;
        }
 
        this.confirmModal = this._modalService.confirm({
            nzTitle: AppConst.dialogContent.DELETE.TITLE,
            nzContent: AppConst.dialogContent.DELETE.BODY,
            nzWrapClassName: 'vertical-center-modal',
            nzOkText: 'Yes',
            nzOkType: 'danger',
            nzOnOk: () => {
                return new Promise((resolve, reject) => 
                {
                    this._feesService
                        .deleteAdjustedFee(item.id)
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            switchMap(message =>
                            {
                                setTimeout(() => this._notification.displaySnackBar(message,NotifyType.SUCCESS), 200);

                                return this._feesService.getAdjustedList(this.selectedItem.id);
                            }),
                            finalize(() => resolve())
                        )
                        .subscribe(
                            list => this.adjustedList = [...list],
                            error => 
                            {
                                throw error;
                            }
                        );
                });
            }
        });
    }

    timeTransform(value: number, type: string): string
    {
        if (isNaN(parseFloat(String(value))) || !isFinite(value))
        {
            return 'N/A';
        }

        type = type || '12h';

        const h = (Math.floor(value / 60) < 10 ? '0' : '') + (type === '12h') ? Math.floor(value / 60 % 12) || 12 : Math.floor(value / 60);
        const m = (Math.floor(value % 60) < 10 ? '0' : '') + Math.floor(value % 60);
        const a = value / 60 < 12 ? 'AM' : 'PM';
        
        return `${h}:${m} ${a}`;
    }
}

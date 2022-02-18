import { Component, OnInit, ViewEncapsulation, Inject, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { CommonService } from 'app/shared/service/common.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { valueExists } from 'app/shared/validators/asynValidator';
import { Child } from 'app/main/modules/child/child.model';
import { User } from 'app/main/modules/user/user.model';
import { AppConst } from 'app/shared/AppConst';
import { BondPaymentservice } from '../../service/bond-payment.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import * as _ from 'lodash';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { BondPayment } from '../../model/bond-payment.model';
import { FinanceService } from '../../../shared/services/finance.service';
import { debounceTime, finalize } from 'rxjs/operators';

@Component({
    selector: 'new-or-edit-bond-payment',
    templateUrl: './new-or-edit-bond-payment.component.html',
    styleUrls: ['./new-or-edit-bond-payment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class NewOrEditBondPaymentComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;
    bondForm: FormGroup;
    buttonLoader: boolean;
    editMode: boolean;
    childList: Child[];
    userList: User[];
    user: User;
    bond: BondPayment;

    loadingChildren: boolean;

    constructor(
        public matDialogRef: MatDialogRef<NewOrEditBondPaymentComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _bonPaymentService: BondPaymentservice,
        private _financialService: FinanceService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) {
        this._unsubscribeAll = new Subject();
        this.editMode = false;

        this.userList = _data.response.user;
        this.childList = [];

        if (_data.action === AppConst.modalActionTypes.EDIT)
        {
            this.dialogTitle = 'Edit Bond Payment';
            this.bond = _data.response.bond ? _data.response.bond : null;
            this.user = this.bond.user
            this.editMode = true;
            this.childList = this.user.children? this.user.children.map((i: any, idx: number) => new Child(i, idx)) : [];
            
            
        }
        else
        {
            this.dialogTitle = 'New Bond Payment';
        }

        this.bondForm = this.createBondForm();

    }

    ngOnInit() {
        
        this.bondForm
        .get('user')
        .valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(value =>
        {
            this._logger.debug('[user value change]', value);

            if (!_.isNull(value))
            {
               this.childList =  this.getChild(value);

               if(this.childList.length < 1){
                    this.bondForm.get('child').patchValue(null, { emitEvent: false });
               }
            }
            else
            {
                this.childList = [];
            }

        });

        this.bondForm.get('inactive_children').valueChanges
            .pipe(
                debounceTime(200)
            )
            .subscribe((value) => {
                console.log('inactive_children', value);
                
                    this.loadChildren(this.fc.user.value, false);
            });

            this.bondForm.get('user').valueChanges
            .pipe(
                debounceTime(200)
            )
            .subscribe((value) => {
                console.log('user', value);
                
                    this.loadChildren(this.fc.user.value, false);
            });
    }

    getChild(value: string): any
    {
        return (value && !_.isEmpty(this.userList.find(i => i.id === value))) ? this.userList.find(i => i.id === value).children : [];
    }

    createBondForm(): FormGroup
    {
        return new FormGroup({
            date: new FormControl(this.editMode ? this.bond.date : '', [Validators.required]),
            child: new FormControl(this.editMode ? this.bond.child.id : null, [Validators.required]),
            user: new FormControl(this.editMode ? this.bond.user.id : null, [Validators.required]),
            type: new FormControl(this.editMode ? this.getType(this.bond.type) : '', [Validators.required]),
            amount: new FormControl(this.editMode ? this.bond.amount : '', [Validators.required]),
            comments: new FormControl(this.editMode ? this.bond.comments : ''),
            inactive_children: new FormControl(false)
        });
    }

    getType(type: any):void {
        let value : any = null;
        if(type === 'Receiving') {
            value = '0'
        }
        else{
            value = '1'
        }

        return value;
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get fc(): any
    {
        return this.bondForm.controls;
    }

    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.bondForm.invalid)
        {
            return;
        }

        const sendObj = {
            date: DateTimeHelper.getUtcDate(this.fc.date.value),
            type: this.fc.type.value,
            child: this.fc.child.value,
            user: this.fc.user.value,
            comments: this.fc.comments.value,
            amount: this.fc.amount.value,
        };

        if (this.editMode) { sendObj['id'] = this.bond.id; }

        this._logger.debug('[bond object]', sendObj);

        this.buttonLoader = true;

        this._bonPaymentService [this.editMode ? 'updateBond' : 'storeBond'](sendObj)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res =>
                {
                    this.buttonLoader = false;

                    this.resetForm(null);

                    setTimeout(() => this.matDialogRef.close(res), 250);
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

    resetForm(e: MouseEvent): void
    {
        if (e) { e.preventDefault(); }

        this.bondForm.reset();

    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(new Date(), current) > 0;
    }

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    loadChildren(value: any, room: boolean): void {
        
        const childrenControl = this.bondForm.get('child');
        const inactiveChildren = this.bondForm.get('inactive_children').value;

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
                this.childList = response;
            });

    }
}

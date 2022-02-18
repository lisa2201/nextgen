import { Component, OnInit, OnDestroy, Inject, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonService } from 'app/shared/service/common.service';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { helpMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Child } from 'app/main/modules/child/child.model';
import { finalize, takeUntil } from 'rxjs/operators';
import { BalanceAdjustmentsService } from '../../services/balance-adjustments.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { User } from 'app/main/modules/user/user.model';

@Component({
    selector: 'app-add-balance-adjustment-dialog',
    templateUrl: './add-balance-adjustment-dialog.component.html',
    styleUrls: ['./add-balance-adjustment-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class AddBalanceAdjustmentDialogComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    adjustmentForm: FormGroup;
    buttonLoading: boolean;
    parents: User[];
    confirmModal: NzModalRef;

    constructor(
        public matDialogRef: MatDialogRef<AddBalanceAdjustmentDialogComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _balanceAdjustmentService: BalanceAdjustmentsService,
        private _modalService: NzModalService
    ) {

        this.unsubscribeAll = new Subject();
        this.parents = _data.parent;
        this.buttonLoading = false;
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.createForm();
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
            account: new FormControl(null, [Validators.required]),
            date: new FormControl('', [Validators.required]),
            type: new FormControl(null, [Validators.required]),
            amount: new FormControl('', [Validators.required, Validators.min(0)]),
            description: new FormControl('', [Validators.required])
        });
    }

    get fc(): any {
        return this.adjustmentForm.controls;
    }


    /**
     * on submit
     */
    onSubmit(): void {

        if (this.adjustmentForm.invalid) {
            return;
        }

        this.confirmModal = this._modalService
            .confirm({
                nzTitle: 'Reset Balance',
                nzContent: 'This action will reset the balance of the selected account to the value entered. This cannot be reversed. Please confirm if this is the intended action.',
                nzWrapClassName: 'vertical-center-modal',
                nzOkText: 'Continue',
                nzOkType: 'primary',
                nzOnOk: () => {
                    return new Promise((resolve, reject) => {

                        this.buttonLoading = true;

                        const sendObj = {
                            account: this.fc.account.value,
                            type: this.fc.type.value,
                            date: DateTimeHelper.getUtcDate(this.fc.date.value),
                            amount: this.fc.amount.value,
                            description: this.fc.description.value
                        };

                        this._balanceAdjustmentService.addAdjustment(sendObj)
                            .pipe(
                                takeUntil(this.unsubscribeAll),
                                finalize(() => {
                                    this.buttonLoading = false;
                                })
                            )
                            .subscribe((response) => {
                                setTimeout(() => this.matDialogRef.close(response), 250);
                                resolve();
                            });

                    });
                }
            });

    }


}


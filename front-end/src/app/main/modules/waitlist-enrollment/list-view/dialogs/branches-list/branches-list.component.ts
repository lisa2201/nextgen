import {Component, Inject, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {helpMotion, NzModalRef, NzModalService} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {Subject} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {Branch} from '../../../../branch/branch.model';
import {WaitListEnrollmentService} from '../../../service/waitlist-enrollment.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';

@Component({
    selector: 'app-branches-list',
    templateUrl: './branches-list.component.html',
    styleUrls: ['./branches-list.component.scss'], encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class BranchesListComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    branches: Branch[];
    item: any
    branchForm: FormGroup;
    buttonLoader: boolean = false;
    confirmModal: NzModalRef;
    emailTrack: boolean = true;

    constructor(
        private _waitListEnrollmentService: WaitListEnrollmentService,
        public matDialogRef: MatDialogRef<BranchesListComponent>,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {

        this._waitListEnrollmentService.changeBranches.subscribe((value) => {
            this.branches = value;
        });
        this.item = _data.item;
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this.branchForm = this.createInputForm();
    }

    createInputForm(): FormGroup {
        return new FormGroup({
            branch: new FormControl(this.item.branch_id, [Validators.required]),
        });
    }

    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }
        setTimeout(() => this.branchForm.reset(), 20);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        if (this.confirmModal) {
            this.confirmModal.close();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    onFormSubmit(e): void {
        if (e !== false) {
            e.preventDefault();
        }
        const sendData =
            {
                currentPKey: this._data.item.id,/* waitlist id */
                branchId: this.branchForm.value.branch,/* branch id(should replace with current waitlist id) */
                form: this._data.form,/* crm type*/
                emailTrack: this.emailTrack,
            }

        this.buttonLoader = true;

        this._waitListEnrollmentService.crmOwnBranchChange(sendData)
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe((code: number) => {
                    if (!code) {
                        return;
                    }
                    this.emailTrack = true;
                    if (this.confirmModal) {
                        this.confirmModal.close();
                    }
                    this.matDialogRef.close({event: 'Close'});
                    if (code === 200) {
                        setTimeout(() => this._notification.displaySnackBar('Successfully moved to branch', NotifyType.SUCCESS), 200);
                    } else if (code === 400) {
                        setTimeout(() => this._notification.displaySnackBar('error', NotifyType.ERROR), 200);
                    }
                    this._notification.clearSnackBar();

                },
                error => {
                    this.confirmModal = this._modalService
                        .confirm(
                            {
                                nzTitle: 'Are you sure move this CMR into selected branch?',
                                nzContent: 'This CRM -> parent email included CRM, already contains same branch',
                                nzWrapClassName: 'vertical-center-modal',
                                nzOkText: 'Yes',
                                nzOkType: 'danger',
                                nzOnOk: () => {
                                    this.emailTrack = false;
                                    this.onFormSubmit(false);
                                }
                            }
                        );
                    // throw error;
                });
    }
}

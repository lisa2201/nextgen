import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { CommonService } from 'app/shared/service/common.service';
import { ChildSessionSubmissionService } from '../../services/session-submission.service';
import { NzModalService } from 'ng-zorro-antd';
import { AuthService } from 'app/shared/service/auth.service';
import { SessionSubmission } from '../../session-submission.model';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
    selector: 'child-withdraw-submission-report',
    templateUrl: './withdraw-submission-report.component.html',
    styleUrls: ['./withdraw-submission-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildWithdrawSubmissionReportComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    dialogTitle: string;

    session: SessionSubmission;
    withdrawSubmissionForm: FormGroup;

    buttonLoader: boolean;
    dependChangeReason: any;

    /**
     * Constructor
     * 
     * @param {MatDialogRef<ChildWithdrawSubmissionReportComponent>} matDialogRef
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {MatDialog} _matDialog
     * @param {AuthService} _authService
     * @param {NzModalService} _modalService
     * @param {ChildSessionSubmissionService} _sessionService
     * @param {*} _data
     */
    constructor(
        public matDialogRef: MatDialogRef<ChildWithdrawSubmissionReportComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _authService: AuthService,
        private _modalService: NzModalService,
        private _sessionService: ChildSessionSubmissionService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    )
    {
        // set default values
        this.session = this._data.session;
        this.dependChangeReason = this._data.response.withdrawal_reason;
        this.buttonLoader = false;
        this.dialogTitle = `Withdraw Session Report ${this.session.startDate}`;

        this.withdrawSubmissionForm = this.createWithdrawalForm();

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
        this._logger.debug('child withdraw submission report !!!', this._data);
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
        return this.withdrawSubmissionForm.controls; 
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createWithdrawalForm(): FormGroup
    {
        return new FormGroup({
            reason: new FormControl(null, [Validators.required]),
            reason_text: new FormControl('', [Validators.required, Validators.maxLength(1000)]),
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

        this.withdrawSubmissionForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.withdrawSubmissionForm.invalid) 
        {
            return;
        }

        const sendObj = {
            id: this.session.id,
            reason: this.fc.reason.value,
            late_reason: this.fc.reason_text.value
        };

        this._logger.debug('[submit child session report]', sendObj);

        this.buttonLoader = true;

        this._sessionService
            .withdrawSessionReport(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                response =>
                {
                    setTimeout(() => this.matDialogRef.close(response), 250);
                },
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

}

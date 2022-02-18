import { Component, Inject, OnDestroy, OnInit, TemplateRef, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Child } from '../../../child.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from '../../../../../../shared/service/notification.service';
import { CommonService } from '../../../../../../shared/service/common.service';
import { AuthService } from '../../../../../../shared/service/auth.service';
import { AccsService } from '../../accs.service';
import { AppConst } from '../../../../../../shared/AppConst';
import { differenceInCalendarDays, endOfWeek, format, startOfWeek, subDays } from 'date-fns';
import { helpMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { fuseAnimations } from '../../../../../../../@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { finalize, takeUntil } from 'rxjs/operators';
import { NotifyType } from '../../../../../../shared/enum/notify-type.enum';
import { CertificateOrDetermination } from '../../certificate-or-determination.model';
import { promise } from 'selenium-webdriver';

@Component({
    selector: 'accs-cancel-certificate',
    templateUrl: './cancel-certificate.html',
    styleUrls: ['./cancel-certificate.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CancelCertificateComponent implements OnInit, OnDestroy {

    action: string;
    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    cancelCertificateForm: FormGroup;
    editMode = false;
    buttonLoader = false;
    showAlert = false;
    certificateOrDetermination: CertificateOrDetermination;
    child: Child;
    weekStart: Date;
    branchDetails: any;
    riskReasons: any;
    showStateTerritory: boolean;
    StateTerBodyType: any;
    confirmModal: NzModalRef;
    /* file upload */
    supportingDoc = [
        {
            name: 'Advise child no longer at risk (67FC)',
            index: 4,
            value: 'ACC005',
            progress: 0,
            showBar: false,
            message: '',
        }
    ];
    selectedDoc: any;
    selectedFileType: any;
    selectedFile: any;
    imageSrc: string;
    /* end file upload */
    alreadySubmitted: any;

    constructor(
        public matDialogRef: MatDialogRef<CancelCertificateComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _auth: AuthService,
        private _accsService: AccsService,
        private _modalService: NzModalService,
    ) {
        this._unsubscribeAll = new Subject();
        this.showAlert = false;
        this.action = _data.action;
        this.certificateOrDetermination = _data.response.determination;
        this.child = _data.response.child;
        this.branchDetails = this._auth.getClient();

        this.dialogTitle = 'Cancel Certificate';

        this.createCancelCertificateForm();

        /* variable to check if child no longer at risk is already submitted. */
        this.alreadySubmitted = false;

    }

    ngOnInit(): void {

        /* check if cancellation is already submitted */
        if (this.certificateOrDetermination.cancel_reason) {
            if (this.certificateOrDetermination.isSynced === '1') {
                this.alreadySubmitted = true;
            }
        }

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.cancelCertificateForm.controls;
    }

    createCancelCertificateForm(): void {
        this.cancelCertificateForm = new FormGroup({
            cancellation_reason: new FormControl((this.certificateOrDetermination.cancel_reason) ? this.certificateOrDetermination.cancel_reason : null, [Validators.required, Validators.maxLength(2000)]),
        });
    }

    onFormSubmit(e: MouseEvent): void {
        if (this.cancelCertificateForm.invalid) {
            return;
        }
        // this.buttonLoader = true;

        const sendData = {
            id: (this.certificateOrDetermination.certificateID) ? this.certificateOrDetermination.certificateID : this.certificateOrDetermination.determinationID,
            child: this.child.id,
            center: this.branchDetails.id,
            cancellation_reason: this.fc.cancellation_reason.value,
            // certificate or determination data in case its not in db.
            apiData: this.certificateOrDetermination
        };

        this.confirmModal = this._modalService.create({
            nzTitle: 'Confirm',
            nzContent: 'Are you Sure you want to cancel this Certificate?',
            nzFooter: '',
            nzMaskClosable: false,
            nzClosable: false,
            nzOnOk: () => {
                this._accsService.cancelCertificate(sendData)
                    .pipe(
                        takeUntil(this._unsubscribeAll),
                    )
                    .subscribe(
                        message => {
                            this._accsService.getDetermination(this.child.id);
                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                            this.matDialogRef.close(message);
                        },
                        error => {
                            this.buttonLoader = false;
                            throw error;
                        }
                    );
            }
        });

    }



    resetForm(): void {

    }

    saveAsDraft(tplContent): void {
        alert('coming soon');
    }
}

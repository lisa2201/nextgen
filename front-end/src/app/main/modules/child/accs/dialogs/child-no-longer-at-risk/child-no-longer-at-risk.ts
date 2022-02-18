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
import { endOfWeek, format, startOfWeek, subDays } from 'date-fns';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { helpMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { fuseAnimations } from '../../../../../../../@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { finalize, takeUntil } from 'rxjs/operators';
import { NotifyType } from '../../../../../../shared/enum/notify-type.enum';
import { CertificateOrDetermination } from '../../certificate-or-determination.model';
import { promise } from 'selenium-webdriver';
import { DateTimeHelper } from '../../../../../../utils/date-time.helper';

@Component({
    selector: 'accs-child-no-longer-at-risk',
    templateUrl: './child-no-longer-at-risk.html',
    styleUrls: ['./child-no-longer-at-risk.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildNoLongerAtRiskComponent implements OnInit, OnDestroy {
    action: string;
    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    childNoLongerAtRiskForm: FormGroup;
    editMode = false;
    buttonLoader = false;
    showAlert = false;
    certificateOrDetermination: CertificateOrDetermination;
    certificateOrDeterminationStartDate: any;
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
    alreadySubmitted: any;

    /* end file upload */
    constructor(
        public matDialogRef: MatDialogRef<ChildNoLongerAtRiskComponent>,
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
        this.certificateOrDetermination = _data.response.certificateOrDetermination;
        this.child = _data.response.child;
        this.branchDetails = this._auth.getClient();
        this.showStateTerritory = false;

        this.dialogTitle = 'Advice Child No Longer At Risk';

        this.createChildNoLongerAtRiskForm();
        /* start document upload */
        this.selectedDoc = [];
        this.selectedFileType = null;
        this.selectedFile = null;
        /* end document upload */

        /* variable to check if child no longer at risk is already submitted. */
        this.alreadySubmitted = false;
    }

    ngOnInit(): void {

        this._logger.debug('child no longer at risk');

        if (this.certificateOrDetermination.certificateID) {
            this.certificateOrDeterminationStartDate = this.certificateOrDetermination.certificateStartDate;
        }
        else {
            this.certificateOrDeterminationStartDate = this.certificateOrDetermination.determinationStartDate;
        }
        this.addSupportingDoc();
        /* check if child no longer at risk is already submitted */
        if (this.certificateOrDetermination.child_no_longer_at_risk_data) {
            if (this.certificateOrDetermination.child_no_longer_at_risk_data.is_synced === '1') {
                this.alreadySubmitted = true;
            }
        }

        this._logger.debug('[already submitted?]', this.alreadySubmitted);
    }

    ngOnDestroy():void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


    disabledPastDates = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, this.certificateOrDeterminationStartDate) < 0 || current.getDay() !== 0;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.childNoLongerAtRiskForm.controls;
    }

    checktoStateTerritory(mode: string): void {
        if (mode === 'toState_Territory') {
            this.fc.orgName.setValidators([Validators.required, Validators.maxLength(255)]);
        }
        else {
            this.fc.orgName.clearValidators();
        }
        this.fc.orgName.updateValueAndValidity();
    }

    createChildNoLongerAtRiskForm(): void {
        this.childNoLongerAtRiskForm = new FormGroup({
            date_no_longer_at_risk: new FormControl((this.certificateOrDetermination.child_no_longer_at_risk_data) ? this.certificateOrDetermination.child_no_longer_at_risk_data.api_data.dateNoLongerAtRisk : null, [Validators.required]),
            no_longer_at_risk_reason: new FormControl((this.certificateOrDetermination.child_no_longer_at_risk_data) ? this.certificateOrDetermination.child_no_longer_at_risk_data.api_data.noLongerAtRiskReason : null, [Validators.required, Validators.maxLength(255)]),
            record_to_support_no_longer_at_risk: new FormControl((this.certificateOrDetermination.child_no_longer_at_risk_data) ? this.certificateOrDetermination.child_no_longer_at_risk_data.api_data.recordToSupportNoLongerAtRisk : null, [Validators.required]),
            supportingDocInput: new FormArray([]),
            documentCheck: new FormArray([]),
        });
    }


    /* File upload */

    handleInputChange(e, item: any): void {
        this.selectedFileType = item;

        const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
        this.selectedFile = file;
        this._logger.debug('this is uploaded file', file.name, file.size, file.type);
        const pattern = /.pdf*/;
        this.selectedFileType.showBar = true;
        this.selectedFileType.progress = 5;
        const reader = new FileReader();
        if (!file.type.match(pattern)) {
            alert('invalid format');
            return;
        }
        reader.onload = this._handleReaderLoaded.bind(this);
        const filename = reader.readAsDataURL(file);


    }
    _handleReaderLoaded(e): any {


        this.selectedFileType.progress = 50;
        const reader = e.target;
        this.imageSrc = reader.result;
        const newstr = this.imageSrc.replace('data:application/pdf;base64,', '');
        const found = this.selectedDoc.find(element => element.documentType === this.selectedFileType.value);
        if (found) {
            const index: number = this.selectedDoc.indexOf(found);
            this.selectedDoc[index] = {
                documentType: this.selectedFileType.value, // 'this doc type',
                fileName: (this.selectedFile.name.includes('.')) ? this.selectedFile.name.split('.').slice(0, -1).join('.') : this.selectedFile.name, // 'this file name', //
                MIMEType: this.selectedFile.type.replace('application/', ''), // 'this file type', // this.selectedFile.type,
                fileContent: newstr,
            };
            setTimeout(() => this.selectedFileType.progress = 100, 500);
            return this.selectedFileType.message === 'File alredy exist';
        }

        this.selectedDoc.push({
            documentType: this.selectedFileType.value, // 'this doc type',
            fileName: (this.selectedFile.name.includes('.')) ? this.selectedFile.name.split('.').slice(0, -1).join('.') : this.selectedFile.name, // 'this file name', //
            MIMEType: this.selectedFile.type.replace('application/', ''), // 'this file type', // this.selectedFile.type,
            fileContent: newstr,
        });

        setTimeout(() => this.selectedFileType.progress = 100, 500);

    }

    // remove selected file
    romoveFile(item: any): void {
        const found = this.selectedDoc.find(element => element.documentType === item.value);
        const index: number = this.selectedDoc.indexOf(found);

        if (index !== -1) {
            this.selectedDoc.splice(index, 1);
            this.resetDefault(item);

        }
    }

    download(e: MouseEvent, doc: any): void {
        e.preventDefault();
        const linkSource = 'data:application/pdf;base64,' + doc.fileContent;
        const downloadLink = document.createElement('a');
        const fileName = doc.fileName;

        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.click();
    }

    resetDefault(item: any): void {
        item.showBar = false;
        item.progress = 0;
    }

    // add individual form controls to the form control array
    addSupportingDoc(): void {
        this.supportingDoc.forEach((v: any, i: number) => {
            const control = new FormControl(null);
            (this.fc.supportingDocInput as FormArray).push(control);
        });
    }

    /*--- end File upload*/




    onFormSubmit(e: MouseEvent, tplContent): void {

        if (this.childNoLongerAtRiskForm.invalid) {
            return;
        }
        // this.buttonLoader = true;

        const sendData = {
            id: (this.certificateOrDetermination.certificateID) ? this.certificateOrDetermination.certificateID : this.certificateOrDetermination.determinationID,
            child: this.child.id,
            center: this.branchDetails.id,
            date_no_longer_at_risk: DateTimeHelper.getUtcDate(this.fc.date_no_longer_at_risk.value),
            no_longer_at_risk_reason: this.fc.no_longer_at_risk_reason.value,
            record_to_support_no_longer_at_risk: this.fc.record_to_support_no_longer_at_risk.value,
            supportingDocInput: this.selectedDoc, // SupportingDocuments, // this.fc.supportingDocInput.value,
        };


        // this.createTplModal(tplContent, 'updateCertificate' , sendData);


        this._accsService.childNoLongerAtRisk(sendData)
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
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );

    }


    createTplModal(tplContent: TemplateRef<{}>, submitSection: string, sendData: any): void {
        this.confirmModal = this._modalService.create({
            nzTitle: 'Confirm',
            nzContent: tplContent,
            nzFooter: '',
            nzMaskClosable: false,
            nzClosable: false,
            nzOnOk: () => {
                return new Promise((resolve, reject) => {
                    this._accsService
                    [submitSection === 'newCertificate' ? 'newCertificate' : submitSection === 'StateTerritory' ? 'saveStateTerritory' : 'updateCertificate'](sendData)
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            finalize(() => resolve())
                        )
                        .subscribe(
                            message => {
                                this.matDialogRef.close(message),
                                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                            },
                            error => {
                                throw error;
                            }
                        );
                });
            }
        });
    }

    resetForm(): void {

    }

    saveAsDraft(tplContent): void {
        alert('coming soon');
    }
}

import { Component, Inject, OnDestroy, OnInit, TemplateRef, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Child } from '../../../child.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from '../../../../../../shared/service/notification.service';
import { CommonService } from '../../../../../../shared/service/common.service';
import { AuthService } from '../../../../../../shared/service/auth.service';
import { AccsService, SelectValues } from '../../accs.service';
import { AppConst } from '../../../../../../shared/AppConst';
import { compareAsc, endOfWeek, format, parse, startOfWeek, subDays } from 'date-fns';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { helpMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { fuseAnimations } from '../../../../../../../@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { finalize, takeUntil } from 'rxjs/operators';
import { NotifyType } from '../../../../../../shared/enum/notify-type.enum';
import { CertificateOrDetermination } from '../../certificate-or-determination.model';
import { DateTimeHelper } from '../../../../../../utils/date-time.helper';
import * as _ from 'lodash';

@Component({
    selector: 'app-new-or-edit-certificate',
    templateUrl: './new-or-edit-certificate.component.html',
    styleUrls: ['./new-or-edit-certificate.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class NewOrEditCertificateComponent implements OnInit, OnDestroy {

    action: string;
    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    certificateForm: FormGroup;
    editMode = false;
    buttonLoader = false;
    showAlert = false;
    certificate: CertificateOrDetermination;
    child: Child;
    weekStart: Date;
    branchDetails: any;
    riskReasons: any;
    showStateTerritory: boolean;
    StateTerBodyType: any;
    confirmModal: NzModalRef;
    createError: boolean;
    stateTerritoryError: boolean;
    enableStateTerritory: boolean;
    exceptionalReasonValues: SelectValues[];

    startDateEnforcement: Date;
    calculatedBackdate: Date;
    lastBackDate: Date;

    riskWeekArray: number[];

    /* file upload */
    supportingDoc = [
        {
            name: 'ACCS ChildWellBeing Evidence (ACC002)',
            index: 0,
            value: 'ACC002',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'ACCS ChildWellBeing other supporting documents (ACC004)',
            index: 1,
            value: 'ACC004',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'Other CCS related document - for Provider (ACC006)',
            index: 2,
            value: 'ACC006',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'Other CCS related document - for Service (ACC007)',
            index: 3,
            value: 'ACC007',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'State/Territory notice (204K notice) (required) (ACC003)',
            index: 4,
            value: 'ACC003',
            progress: 0,
            showBar: false,
            message: '',
        },
        {
            name: 'Evidence of exceptional circumstance (ACC008)',
            index: 5,
            value: 'ACC008',
            progress: 0,
            showBar: false,
            message: '',
        }
    ];
    selectedDoc: any;
    selectedFileType: any;
    selectedFile: any;
    imageSrc: string;
    checkIfDocumentAttached: boolean;
    /* end file upload */
    constructor(
        public matDialogRef: MatDialogRef<NewOrEditCertificateComponent>,
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
        this.certificate = _data.response.certificate;
        this.child = _data.response.child;
        this.branchDetails = this._auth.getClient();
        this.showStateTerritory = false;
        this.checkIfDocumentAttached = false;
        this.riskReasons = [
            { key: 'COSTB', value: 'Under care and protection of a State/Territory child protection legislation' },
            { key: 'ABUSED', value: 'Suffered harm due to experiencing physical, emotional or psychological abuse' },
            { key: 'SABUSE', value: 'Is being subjected to sexual abuse' },
            { key: 'DOMVIO', value: 'Suffering as a result of exposure to domestic or family violence' },
            { key: 'NEGLEC', value: 'Suffering, or is at risk of suffering harm caused by neglect' },
            { key: 'ABPAST', value: 'Suffered harm due to experiencing physical, emotional or psychological abuse' },
            { key: 'SAPAST', value: 'Suffered harm in the past due to being subjected to sexual abuse' },
            { key: 'VIPAST', value: 'Suffered harm in the past due to exposure to domestic or family violence' },
            { key: 'NEGPST', value: 'Suffered harm in the past due to experiencing neglect' }
        ];
        this.StateTerBodyType = [
            { key: 'CODE01', value: 'Parenting Assist, Family Support Program' },
            { key: 'CODE02', value: 'Conflict/Separation/Mediation services' },
            { key: 'CODE03', value: 'Child and Maternal Health Services' },
            { key: 'CODE04', value: 'Drug/Substance Abuse Services' },
            { key: 'CODE05', value: 'Community Health Services' },
            { key: 'CODE06', value: 'Domestic Violence/Rape Victim Support' },
            { key: 'CODE07', value: 'Homelessness, Crisis or Public Housing' },
            { key: 'CODE08', value: 'Financial/Gambling Counselling Services' },
            { key: 'CODE09', value: 'Aboriginal Torres Strait Services' },
            { key: 'CODE10', value: 'School Education Related Services' },
            { key: 'CODE11', value: 'Other Early Intervention Services' },
            { key: 'CODE12', value: 'Child Protection Agency' },
        ];

        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Certificate';

            this._logger.debug('[certificate]', this.certificate);

            this.editMode = true;
            this.createError = false;
            this.stateTerritoryError = false;
            if (this.certificate.isSynced === '2') {
                this.createError = true;
            }
            if (this.certificate.isSynced === '3') {
                this.stateTerritoryError = true;
                this.showStateTerritory = true;
            }
        }
        else {
            this.dialogTitle = 'New Certificate';
        }
        this.createCertificateForm();
        /* start document upload */
        this.selectedDoc = [];
        this.selectedFileType = null;
        this.selectedFile = null;
        this.startDateEnforcement = parse('2021-03-29', 'yyyy-MM-dd', new Date());
        
        /* end document upload */
    }

    ngOnInit(): void {

        this.lastBackDate = endOfWeek(subDays(new Date(), 98));
        this.calculatedBackdate = compareAsc(this.startDateEnforcement, this.lastBackDate) === 1 ? this.startDateEnforcement : this.lastBackDate;
        
        // range from 1 to 13
        this.riskWeekArray = _.range(1,14);

        this.exceptionalReasonValues = this._accsService.getExceptionalCircumstanceValues();

        this._hearAboutChange();
        this.addSupportingDoc();

        this.initHandlers();
        if (this.editMode) {

            this.addEditData();
            // this.addDocumentCheckbox();
            if (this.certificate.stateTerritoryData) {
                if (this.certificate.stateTerritoryData.dateNoticeGiven && this.certificate.stateTerritoryData.dateNoticeGiven !== '0000-00-00') {
                    this.showStateTerritory = true;
                }
            }
            if (!this.createError) {
                this.enableStateTerritory = true;
            }
        }

        //    check if supporting documents are appended. if not get the supporting documents from the api data column.
        if (this.certificate) {
            this.certificate.SupportingDocuments = (this.certificate.SupportingDocuments) ? this.certificate.SupportingDocuments : this.certificate.certificateOrDeterminationApiData.SupportingDocuments;
        }

        /* when submitting the state territory data, check if the By state territory is selected. if yes, the document is mandatory*/
        if (this.certificate) {
            if (this.certificate.stateTerritoryData) {
                if (this.certificate.stateTerritoryData.isNotifiedByStateTerritory) {
                    this.checkIfDocumentAttached = true;
                }
            }
        }

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    initHandlers(): void {

        this.certificateForm.get('certificate_start_date')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value: any) => {
                this.weekStartChangeHandler(value);
            });

        this.certificateForm.get('exceptionalReason')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value: any) => {
                this.exceptionalReasonChangeHandler(value);
            });

    }

    disabledFourMondaysBefore = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, this.calculatedBackdate) <= 0 || current.getDay() !== 1;
    }

    disabledPastDates = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) < 0;
    }

    weekStartChangeHandler(value: any): void {

        const exceptionControl = this.certificateForm.get('exceptionalReason');

        if (value) {

            this.weekStart = value;
            const selectedDate = DateTimeHelper.parseMoment(value).startOf('day');
            const maxDate = DateTimeHelper.now().startOf('day').subtract(28, 'days');
            
            if (selectedDate.isBefore(maxDate)) {
                exceptionControl.enable();
            } else {
                exceptionControl.reset();
                exceptionControl.disable();
            }
        } else {
            exceptionControl.reset();
            exceptionControl.disable();
        }

    }

    exceptionalReasonChangeHandler(value: any): void {

        const exceptionTextControl = this.certificateForm.get('exceptionalReasonText');

        if (value) {

            if (value === 'OTHER') {
                exceptionTextControl.enable();
            } else {
                exceptionTextControl.reset();
                exceptionTextControl.disable();
            }

        } else {
            exceptionTextControl.reset();
            exceptionTextControl.disable();
        }


    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.certificateForm.controls;
    }

    checktoStateTerritory(mode: string): void {
        if (mode === 'toState_Territory') {
            this.fc.orgName.setValidators([Validators.required, Validators.maxLength(255)]);
            this.checkIfDocumentAttached = false;
        }
        else {
            this.fc.orgName.clearValidators();
            /* when submitting the state territory data, check if the By state territory is selected. if yes, the document is mandatory*/
            if (this.selectedDoc.length) {
                this.checkIfDocumentAttached = false;
            }
            else {
                this.checkIfDocumentAttached = true;
            }
        }
        this.fc.orgName.updateValueAndValidity();
    }
    /* when submitting the state territory data, check if the By state territory is selected. if yes, the document is mandatory*/
    checkifDocShouldbeUploaded(): void {
        /* when submitting the state territory data, check if the By state territory is selected. if yes, the document is mandatory*/
        if (this.fc.byToStateTerritory.value === 'byState_Territory') {
            if (this.selectedDoc.length) {
                this.checkIfDocumentAttached = false;
            }
            else {
                this.checkIfDocumentAttached = true;
            }
        }
        else {
            this.checkIfDocumentAttached = false;
        }
    }



    createCertificateForm(): void {

        this.certificateForm = new FormGroup({
            child: new FormControl(this.child.id, [Validators.required]),
            certificate_start_date: new FormControl(null, [Validators.required]),
            center: new FormControl(null, [Validators.required]),
            weeksAtRisk: new FormControl(null, [Validators.required]),
            evidenceHeld: new FormControl(false, [Validators.requiredTrue]),
            riskReasons: new FormControl(null, [Validators.required]),
            stateTerritorySwitch: new FormControl(null),
            byToStateTerritory: new FormControl(null),
            dateNoticeGiven: new FormControl(null),
            bodyType: new FormControl(null),
            orgName: new FormControl(null),
            refNo: new FormControl(null),
            statePersonNameOrID: new FormControl(null),
            statePersonContact: new FormControl(null, [Validators.minLength(10)]),
            statePersonEmail: new FormControl(null),
            notifiedByPersonFirstName: new FormControl(null),
            notifiedByPersonLastName: new FormControl(null),
            exceptionalReason: new FormControl({value: null, disabled: true}, [Validators.required]),
            exceptionalReasonText: new FormControl({value: null, disabled: true}, [Validators.required]),

            supportingDocInput: new FormArray([]),
            documentCheck: new FormArray([]),

            state_territory_response: new FormControl(null),
            certificate_response: new FormControl(null)
        });
    }

    addEditData(): void {

        this.certificateForm.patchValue({
            // child: this.child.id,
            certificate_start_date: this.certificate.certificateOrDeterminationApiData.certificateStartDate,
            center: null,
            weeksAtRisk: this.certificate.certificateOrDeterminationApiData.weeksAtRisk.toString(),
            evidenceHeld: this.certificate.certificateOrDeterminationApiData.isEvidenceHeld,
            riskReasons: this.certificate.riskReasons || null,
            stateTerritorySwitch:(this.certificate.stateTerritoryData) ? (this.certificate.stateTerritoryData.dateNoticeGiven != null && this.certificate.stateTerritoryData.dateNoticeGiven !== '0000-00-00') ? true : false : false,
            byToStateTerritory:(this.certificate.stateTerritoryData) ? (this.certificate.stateTerritoryData.isNotifiedByStateTerritory === 'true') ? 'byState_Territory' : 'toState_Territory' : null,
            dateNoticeGiven: (this.certificate.stateTerritoryData) ? (this.certificate.stateTerritoryData.dateNoticeGiven !== '0000-00-00') ? this.certificate.stateTerritoryData.dateNoticeGiven : null : null,
            bodyType: this.certificate?.stateTerritoryData?.bodyType,
            orgName: this.certificate?.stateTerritoryData?.organisationName,
            refNo: this.certificate?.stateTerritoryData?.stateReferenceNumber,
            statePersonNameOrID: this.certificate?.stateTerritoryData?.statePersonNameOrID,
            statePersonContact: this.certificate?.stateTerritoryData?.statePersonContact,
            statePersonEmail: this.certificate?.stateTerritoryData?.statePersonEmail,
            notifiedByPersonFirstName: this.certificate?.stateTerritoryData?.notifiedByPersonFirstName,
            notifiedByPersonLastName: this.certificate?.stateTerritoryData?.notifiedByPersonLastName,
            exceptionalReason: this.certificate?.certificateOrDeterminationApiData?.exceptionalCircumstanceReason,
            exceptionalReasonText: this.certificate?.certificateOrDeterminationApiData?.exceptionalCircumstanceText
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
                documentType: this.selectedFileType.value,
                fileName: (this.selectedFile.name.includes('.')) ? this.selectedFile.name.split('.').slice(0, -1).join('.') : this.selectedFile.name, // 'this file name', //
                MIMEType: this.selectedFile.type.replace('application/', ''),
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
        /* for state territory. if the doc is uploaded enable the submit button*/
        this.checkifDocShouldbeUploaded();

    }

    // remove selected file
    romoveFile(item: any): void {
        const found = this.selectedDoc.find(element => element.documentType === item.value);
        const index: number = this.selectedDoc.indexOf(found);

        if (index !== -1) {
            this.selectedDoc.splice(index, 1);
            this.resetDefault(item);

        }
        /* for state territory. if the doc is uploaded enable the submit button*/
        this.checkifDocShouldbeUploaded();
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

    download(e: MouseEvent, doc: any): void {
        e.preventDefault();
        const linkSource = 'data:application/pdf;base64,' + doc.fileContent;
        const downloadLink = document.createElement('a');
        const fileName = doc.fileName;

        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.click();
    }

    /* check if the specific document Type is uplaoded and if yes enable the upload button for the specific doc type */
    checkIfFileUploaded(documentType): boolean {
        return this.selectedDoc.filter(item => item.documentType === documentType).length;
    }



    /*--- END File upload*/


    _hearAboutChange(): void {

        this.certificateForm.get('stateTerritorySwitch').valueChanges
            .pipe()
            .subscribe((value: boolean) => {

                if (value === true) {
                    this._logger.debug('validations activated');
                    this.showStateTerritory = true;
                    this.fc.byToStateTerritory.setValidators([Validators.required]);
                    this.fc.dateNoticeGiven.setValidators([Validators.required]);
                    this.fc.orgName.setValidators([Validators.required, Validators.maxLength(255)]);
                    this.fc.bodyType.setValidators([Validators.required]);
                    this.fc.refNo.setValidators([Validators.maxLength(20)]);
                    this.fc.statePersonNameOrID.setValidators([Validators.maxLength(40)]);
                    this.fc.statePersonContact.setValidators([Validators.maxLength(30)]);
                    this.fc.statePersonEmail.setValidators([Validators.maxLength(255)]);
                    this.fc.notifiedByPersonFirstName.setValidators([Validators.maxLength(40)]);
                    this.fc.notifiedByPersonLastName.setValidators([Validators.maxLength(40)]);

                    this.fc.byToStateTerritory.updateValueAndValidity();
                    this.fc.dateNoticeGiven.updateValueAndValidity();
                    this.fc.orgName.updateValueAndValidity();
                    this.fc.bodyType.updateValueAndValidity();
                    this.fc.refNo.updateValueAndValidity();
                    this.fc.statePersonNameOrID.updateValueAndValidity();
                    this.fc.statePersonContact.updateValueAndValidity();
                    this.fc.statePersonEmail.updateValueAndValidity();
                    this.fc.notifiedByPersonFirstName.updateValueAndValidity();
                    this.fc.notifiedByPersonLastName.updateValueAndValidity();

                    this.fc.byToStateTerritory.reset();
                    this.fc.dateNoticeGiven.reset();
                    this.fc.orgName.reset();
                    this.fc.bodyType.reset();
                    this.fc.refNo.reset();
                    this.fc.statePersonNameOrID.reset();
                    this.fc.statePersonContact.reset();
                    this.fc.statePersonEmail.reset();
                    this.fc.notifiedByPersonFirstName.reset();
                    this.fc.notifiedByPersonLastName.reset();
                }
                else {
                    this._logger.debug('validations deactivated');
                    this.showStateTerritory = false;
                    this.fc.byToStateTerritory.clearValidators();
                    this.fc.dateNoticeGiven.clearValidators();
                    this.fc.orgName.clearValidators();
                    this.fc.bodyType.clearValidators();
                    this.fc.refNo.clearValidators();
                    this.fc.statePersonNameOrID.clearValidators();
                    this.fc.statePersonContact.clearValidators();
                    this.fc.statePersonEmail.clearValidators();
                    this.fc.notifiedByPersonFirstName.clearValidators();
                    this.fc.notifiedByPersonLastName.clearValidators();

                    this.fc.byToStateTerritory.updateValueAndValidity();
                    this.fc.dateNoticeGiven.updateValueAndValidity();
                    this.fc.orgName.updateValueAndValidity();
                    this.fc.bodyType.updateValueAndValidity();
                    this.fc.refNo.updateValueAndValidity();
                    this.fc.statePersonNameOrID.updateValueAndValidity();
                    this.fc.statePersonContact.updateValueAndValidity();
                    this.fc.statePersonEmail.updateValueAndValidity();
                    this.fc.notifiedByPersonFirstName.updateValueAndValidity();
                    this.fc.notifiedByPersonLastName.updateValueAndValidity();

                    this.fc.byToStateTerritory.reset();
                    this.fc.dateNoticeGiven.reset();
                    this.fc.orgName.reset();
                    this.fc.bodyType.reset();
                    this.fc.refNo.reset();
                    this.fc.statePersonNameOrID.reset();
                    this.fc.statePersonContact.reset();
                    this.fc.statePersonEmail.reset();
                    this.fc.notifiedByPersonFirstName.reset();
                    this.fc.notifiedByPersonLastName.reset();

                }
            });
    }


    onFormSubmit(e: MouseEvent, tplContent): void {

        if (this.certificateForm.invalid) {
            return;
        }
        // this.buttonLoader = true;

        const sendData = {
            id: (this.editMode) ? this.certificate.id : null,
            child: this.fc.child.value,
            certificate_start_date: DateTimeHelper.getUtcDate(this.fc.certificate_start_date.value),
            center: this.fc.center.value,
            weeksAtRisk: this.fc.weeksAtRisk.value,
            evidenceHeld: this.fc.evidenceHeld.value,
            riskReasons: this.fc.riskReasons.value,
            // cancellation_reason: this.fc.cancellation_reason.value,
            stateTerritorySwitch: this.fc.stateTerritorySwitch.value,
            byToStateTerritory: this.fc.byToStateTerritory.value,
            dateNoticeGiven: DateTimeHelper.getUtcDate(this.fc.dateNoticeGiven.value),
            bodyType: this.fc.bodyType.value,
            orgName: this.fc.orgName.value,
            refNo: this.fc.refNo.value,
            statePersonNameOrID: this.fc.statePersonNameOrID.value,
            statePersonContact: this.fc.statePersonContact.value,
            statePersonEmail: this.fc.statePersonEmail.value,
            notifiedByPersonFirstName: this.fc.notifiedByPersonFirstName.value,
            notifiedByPersonLastName: this.fc.notifiedByPersonLastName.value,
            supportingDocInput: this.selectedDoc, // SupportingDocuments, // this.fc.supportingDocInput.value,
            exceptionalReason: this.fc.exceptionalReason.value,
            exceptionalReasonText: this.fc.exceptionalReasonText.value
        };

        if (this.editMode) {
            this.createTplModal(tplContent, 'updateCertificate', sendData);
        }
        else {
            this.createTplModal(tplContent, 'newCertificate', sendData);
        }
    }

    updateStateTerritory(tplContent): void {
        // the "delete lines are there to delete unnecessary data,
        // that was added to the synced api data for readability in the form. these are only added to the API data not db data
        if (this.certificate.certificateID) {
            delete this.certificate.certificateOrDeterminationApiData;
            delete this.certificate.StateTerritory;
            delete this.certificate.stateTerritoryData;
            delete this.certificate.riskReasons;
        }
        const sendDataStateTerritory = {
            id: (this.editMode) ? this.certificate.id : null,
            center: this.fc.center.value,
            certificateAPIID: (this.certificate.certificateID) ? this.certificate.certificateID : null,
            stateTerritorySwitch: this.fc.stateTerritorySwitch.value,
            byToStateTerritory: this.fc.byToStateTerritory.value,
            dateNoticeGiven: DateTimeHelper.getUtcDate(this.fc.dateNoticeGiven.value),
            bodyType: this.fc.bodyType.value,
            orgName: this.fc.orgName.value,
            refNo: this.fc.refNo.value,
            statePersonNameOrID: this.fc.statePersonNameOrID.value,
            statePersonContact: this.fc.statePersonContact.value,
            statePersonEmail: this.fc.statePersonEmail.value,
            notifiedByPersonFirstName: this.fc.notifiedByPersonFirstName.value,
            notifiedByPersonLastName: this.fc.notifiedByPersonLastName.value,
            supportingDocInput: this.selectedDoc, // SupportingDocuments, // this.fc.supportingDocInput.value,

            // certificate data in case its not in db.
            child: this.fc.child.value,
            apiData: this.certificate
        };

        this.createTplModal(tplContent, 'StateTerritory', sendDataStateTerritory);
    }

    updateDocuments(): void {
        const sendData = {
            certificateID: this.certificate.certificateID,
            child: this.fc.child.value,
            center: this.fc.center.value,
            supportingDocInput: this.selectedDoc, // SupportingDocuments, // this.fc.supportingDocInput.value,
        };

        this._accsService.updateDocuments(sendData)
            .pipe(
                takeUntil(this._unsubscribeAll),
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
    }

    updateDocument(doctype): void {
        const sendData = {
            certificateID: this.certificate.certificateID,
            child: this.fc.child.value,
            center: this.fc.center.value,
            supportingDocInput: this.selectedDoc.filter(item => item.documentType === doctype)     // get only the clicked upload buttons' corresponding document
        };
        this._accsService.updateDocuments(sendData)
            .pipe(
                takeUntil(this._unsubscribeAll),
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
    }

    updateDocument204k(doctype): void {
        const sendData = {
            certificateID: this.certificate.certificateID,
            child: this.fc.child.value,
            center: this.fc.center.value,
            supportingDocInput: this.selectedDoc.filter(item => item.documentType === doctype)     // get only the clicked upload buttons' corresponding document
        };
        this._accsService.updateDocument204k(sendData)
            .pipe(
                takeUntil(this._unsubscribeAll),
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
                                this._accsService.getDetermination(this.child.id);
                                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                                this.matDialogRef.close(message);
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
        // alert('coming soon');

        const sendData = {
            draft: 'Save As Draft',
            id: (this.editMode) ? this.certificate.id : null,
            child: this.fc.child.value,
            certificate_start_date: DateTimeHelper.getUtcDate(this.fc.certificate_start_date.value),
            center: this.fc.center.value,
            weeksAtRisk: this.fc.weeksAtRisk.value,
            evidenceHeld: this.fc.evidenceHeld.value,
            riskReasons: this.fc.riskReasons.value,
            // cancellation_reason: this.fc.cancellation_reason.value,
            stateTerritorySwitch: this.fc.stateTerritorySwitch.value,
            byToStateTerritory: this.fc.byToStateTerritory.value,
            dateNoticeGiven: DateTimeHelper.getUtcDate(this.fc.dateNoticeGiven.value),
            bodyType: this.fc.bodyType.value,
            orgName: this.fc.orgName.value,
            refNo: this.fc.refNo.value,
            statePersonNameOrID: this.fc.statePersonNameOrID.value,
            statePersonContact: this.fc.statePersonContact.value,
            statePersonEmail: this.fc.statePersonEmail.value,
            notifiedByPersonFirstName: this.fc.notifiedByPersonFirstName.value,
            notifiedByPersonLastName: this.fc.notifiedByPersonLastName.value,
            supportingDocInput: this.selectedDoc, // SupportingDocuments, // this.fc.supportingDocInput.value,
            exceptionalReason: this.fc.exceptionalReason.value,
            exceptionalReasonText: this.fc.exceptionalReasonText.value
        };


        this._accsService
            .newCertificate(sendData)
            .pipe(
                takeUntil(this._unsubscribeAll),
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

    }

    hasValidator(control: string, validator: string): boolean {
        if (_.isNull(this.certificateForm.get(control).validator)) {
            return false;
        }
        
        const formControl = this.certificateForm.get(control).validator({} as AbstractControl);
    
        return formControl && formControl.hasOwnProperty(validator);
    }

    getAgency(): string {
        return this.certificate?.certificateOrDeterminationApiData?.decisionMakingAgency ? AppConst.ACCSDecisionMakingAgencyMap[this.certificate?.certificateOrDeterminationApiData?.decisionMakingAgency] : 'N/A';
    }

}

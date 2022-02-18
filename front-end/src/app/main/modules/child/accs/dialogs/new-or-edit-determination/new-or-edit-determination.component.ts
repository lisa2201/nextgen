import { Component, Inject, OnDestroy, OnInit, TemplateRef, ViewEncapsulation } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from '../../../../../../shared/service/notification.service';
import { CommonService } from '../../../../../../shared/service/common.service';
import { Subject } from 'rxjs';
import { AppConst } from '../../../../../../shared/AppConst';
import { Child } from '../../../child.model';
import { compareAsc, endOfWeek, format, getISOWeek, parse, startOfWeek, subDays } from 'date-fns';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { AuthService } from '../../../../../../shared/service/auth.service';
import { helpMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { fuseAnimations } from '../../../../../../../@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AccsService, SelectValues } from '../../accs.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { NotifyType } from '../../../../../../shared/enum/notify-type.enum';
import { CertificateOrDetermination } from '../../certificate-or-determination.model';
import { DateTimeHelper } from '../../../../../../utils/date-time.helper';
import * as _ from 'lodash';

@Component({
    selector: 'app-new-or-edit-determination',
    templateUrl: './new-or-edit-determination.component.html',
    styleUrls: ['./new-or-edit-determination.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class NewOrEditDeterminationComponent implements OnInit, OnDestroy {


    action: string;
    private _unsubscribeAll: Subject<any>;
    dialogTitle: string;
    determinationForm: FormGroup;
    editMode = false;
    buttonLoader = false;
    showAlert = false;
    child: Child;
    date = null;
    branchDetails: any;
    riskReasons: any;
    weekStart: Date;
    showChildNoLongerRisk: boolean;
    confirmModal: NzModalRef;
    determination: CertificateOrDetermination;
    linkedCertificates: any[];
    fromAPI: boolean;
    StateTerBodyType: any;
    showStateTerritory: boolean;
    createError: boolean;
    stateTerritoryError: boolean;
    enableStateTerritory: boolean;

    startDateEnforcement: Date;
    calculatedBackdate: Date;
    lastBackDate: Date;
    extendedWeekSubmissionDate: Date;

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

    exceptionalReasonValues: SelectValues[];
    extensionReasonValues: SelectValues[];
    extensionSubmissionDateValid: boolean;

    riskWeekArray: number[];
    selectedDoc: any;
    selectedFileType: any;
    selectedFile: any;
    imageSrc: string;
    checkIfDocumentAttached: boolean;
    /* end file upload */

    constructor(
        public matDialogRef: MatDialogRef<NewOrEditDeterminationComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _auth: AuthService,
        private _accsService: AccsService,
        private _modalService: NzModalService,
    ) {
        this._logger.debug('[determination data]', _data);
        this._unsubscribeAll = new Subject();
        this.showAlert = false;
        this.action = _data.action;
        this.determination = _data.response.determination;
        this.linkedCertificates = _data.response.linkedCertificates;
        this.fromAPI = _data.response.fromAPI;
        this.child = _data.response.child;
        this.showStateTerritory = false;
        this.showChildNoLongerRisk = false;
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

        this.branchDetails = this._auth.getClient();

        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Determination';
            this.editMode = true;
            this.createError = false;
            this.stateTerritoryError = false;
            if (this.determination.isSynced === '2') {
                this.createError = true;
            }
            if (this.determination.isSynced === '3') {
                this.stateTerritoryError = true;
                this.showStateTerritory = true;
            }
        }
        else {
            this.dialogTitle = 'New Determination';
        }
        this.createDeterminationForm();
        /* start document upload */
        this.selectedDoc = [];
        this.selectedFileType = null;
        this.selectedFile = null;
        /* end document upload */

        this.startDateEnforcement = parse('2021-03-29', 'yyyy-MM-dd', new Date());
        this.extendedWeekSubmissionDate = parse('2021-07-01', 'yyyy-MM-dd', new Date());
        this.extensionSubmissionDateValid = false;
    }

    ngOnInit(): void {

        this.lastBackDate = endOfWeek(subDays(new Date(), 98));
        this.calculatedBackdate = compareAsc(this.startDateEnforcement, this.lastBackDate) === 1 ? this.startDateEnforcement : this.lastBackDate;

        if (_.filter(this.child.enrollments, {'arrangementType': 'CWA', 'status': 'CONFIR'}).length > 0) {
            // range from 1 to 52 for CWA enrolment
            this.riskWeekArray = _.range(1, 53);
        } else {
            // range from 1 to 13
            this.riskWeekArray = _.range(1, 14);
        }

        this.exceptionalReasonValues = this._accsService.getExceptionalCircumstanceValues();
        this.extensionReasonValues = this._accsService.getExtensionReasonValues();

        this._hearAboutChange();
        this.addSupportingDoc();
        this.initHandlers();
        if (this.editMode) {

            this.addEditData();

            // this.addDocumentCheckbox();
            if (this.determination.stateTerritoryData) {
                if (this.determination.stateTerritoryData.dateNoticeGiven && this.determination.stateTerritoryData.dateNoticeGiven !== '0000-00-00') {
                    this.showStateTerritory = true;
                }
            }
            /*if (!this.createError){
                this.enableStateTerritory = true;
            }*/
        }
        //    check if supporting documents are appended. if not get the supporting documents from the api data column.
        if (this.determination) {
            this.determination.SupportingDocuments = (this.determination.SupportingDocuments) ? this.determination.SupportingDocuments : this.determination.certificateOrDeterminationApiData.SupportingDocuments;
        }
        /* when submitting the state territory data, check if the By state territory is selected. if yes, the document is mandatory*/
        if (this.determination) {
            if (this.determination.stateTerritoryData) {
                if (this.determination.stateTerritoryData.isNotifiedByStateTerritory) {
                    this.checkIfDocumentAttached = true;
                }
            }
        }
        /* format the documents to readable form format if coming from API*/
        if (this.fromAPI) {
            this.determination.SupportingDocuments = this.determination.SupportingDocuments.results;
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
        return this.determinationForm.controls;
    }

    initHandlers(): void {

        this.determinationForm.get('determination_start_date')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value: any) => {
                this.weekStartChangeHandler(value);
            });

        this.determinationForm.get('exceptionalReason')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value: any) => {
                this.exceptionalReasonChangeHandler(value);
            });

        this.determinationForm.get('weeksAtRisk')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value: any) => {
                this.weekRiskChangeHanlder(value);
            });
    }

    weekStartChangeHandler(value: any): void {

        const exceptionControl = this.determinationForm.get('exceptionalReason');

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

        const exceptionTextControl = this.determinationForm.get('exceptionalReasonText');

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

    weekRiskChangeHanlder(value: any): void {

        const extensionReasonControl = this.determinationForm.get('extensionReasons');
        
        if (value) {
            
            if (value > 13) {
    
                if (DateTimeHelper.now().startOf('day').isBefore(DateTimeHelper.parseMoment(this.extendedWeekSubmissionDate).startOf('day'))) {
                    this.extensionSubmissionDateValid = false;
                }
                extensionReasonControl.enable();
    
            } else {
                this.extensionSubmissionDateValid = true;
                extensionReasonControl.reset();
                extensionReasonControl.disable();
            }

        } else {
            extensionReasonControl.reset();
            extensionReasonControl.disable();
        }

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


    /* when submitting the state territory data, check if the By state territory is selected. if yes, the document is mandatory*/
    checkifDocShouldbeUploaded(): void {
        /* when submitting the state territory data, check if the By state territory is selected. if yes, the document is mandatory*/
        if (this.fc.byToStateTerritory.value === 'byState_Territory') {
            if (this.selectedDoc.length) {
                let tempvar: boolean;
                tempvar = true;
                this.selectedDoc.forEach(function (entry) {
                    if (entry.documentType === 'ACC003') {
                        tempvar = false;
                    }
                });
                this.checkIfDocumentAttached = tempvar;
            }
            else {
                this.checkIfDocumentAttached = true;
            }
        }
        else {
            this.checkIfDocumentAttached = false;
        }
    }

    createDeterminationForm(): void {

        if (this.fromAPI === true) {
            this.determination.certificateOrDeterminationApiData = this.determination;
        }

        this.determinationForm = new FormGroup({
            child: new FormControl(this.child.id, [Validators.required]),
            determination_start_date: new FormControl(null, [Validators.required]),
            center: new FormControl(null, [Validators.required]),
            certificateLink: new FormControl(null, [Validators.required]),
            weeksAtRisk: new FormControl(null, [Validators.required]),
            riskReasons: new FormControl(null, [Validators.required]),
            risk_to_date: new FormControl(null, [Validators.required]),
            additional_info: new FormControl(null, [Validators.maxLength(1000)]),
            reason_no_third_party: new FormControl(null, [Validators.maxLength(1000)]),
            // state/territory details section
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
            determination_response: new FormControl(null),
            state_territory_response: new FormControl(null),
            exceptionalReason: new FormControl({value: null, disabled: true}, [Validators.required]),
            exceptionalReasonText: new FormControl({value: null, disabled: true}, [Validators.required]),
            extensionReasons: new FormControl({value: [], disabled: true}, [Validators.required]),
            // child no longer at risk section
            childNoLongerRiskSwitch: new FormControl(null),
            date_no_longer_at_risk: new FormControl(null),

            supportingDocInput: new FormArray([]),
            documentCheck: new FormArray([]),
        });

    }

    addEditData(): void {

        this.determinationForm.patchValue({
            determination_start_date: this.determination?.certificateOrDeterminationApiData?.determinationStartDate,
            certificateLink: this.determination.certificateOrDeterminationApiData.certificateID,
            weeksAtRisk: this.determination?.certificateOrDeterminationApiData?.weeksAtRisk?.toString(),
            riskReasons: this.determination?.riskReasons,
            risk_to_date: (DateTimeHelper.parseMoment(this.determination.certificateOrDeterminationApiData.indicativeRiskToDate).isValid() ? this.determination.certificateOrDeterminationApiData.indicativeRiskToDate : null),
            additional_info: this.determination?.certificateOrDeterminationApiData?.additionalInfo,
            reason_no_third_party: this.determination?.certificateOrDeterminationApiData?.reasonNo3rdParty,
            // state/territory details section
            stateTerritorySwitch: (this.determination.stateTerritoryData) ? (this.determination.stateTerritoryData.dateNoticeGiven != null && this.determination.stateTerritoryData.dateNoticeGiven !== '0000-00-00') ? true : false : null,
            byToStateTerritory: (this.determination.stateTerritoryData) ? (this.determination.stateTerritoryData.isNotifiedByStateTerritory === 'true') ? 'byState_Territory' : 'toState_Territory' : null,
            dateNoticeGiven: (this.determination.stateTerritoryData) ? (this.determination.stateTerritoryData.dateNoticeGiven !== '0000-00-00') ? this.determination.stateTerritoryData.dateNoticeGiven : null : null,
            bodyType: this.determination?.stateTerritoryData?.bodyType,
            orgName: this.determination?.stateTerritoryData?.organisationName,
            refNo: this.determination?.stateTerritoryData?.stateReferenceNumber,
            statePersonNameOrID: this.determination?.stateTerritoryData?.statePersonNameOrID,
            statePersonContact: this.determination?.stateTerritoryData?.statePersonContact,
            statePersonEmail: this.determination?.stateTerritoryData?.statePersonEmail,
            notifiedByPersonFirstName: this.determination?.stateTerritoryData?.notifiedByPersonFirstName,
            notifiedByPersonLastName: this.determination?.stateTerritoryData?.notifiedByPersonLastName,
            exceptionalReason: this.determination?.certificateOrDeterminationApiData?.exceptionalCircumstanceReason,
            exceptionalReasonText: this.determination?.certificateOrDeterminationApiData?.exceptionalCircumstanceText,
            extensionReasons: this.determination?.extensionReasons
        });

    }

    disabledFourMondaysBefore = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, this.calculatedBackdate) <= 0 || current.getDay() !== 1;
    }

    disabledPastDates = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) < 0;
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
    /*--- end File upload*/

    _hearAboutChange(): void {

        this.determinationForm.get('stateTerritorySwitch').valueChanges
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

        this.determinationForm.get('childNoLongerRiskSwitch').valueChanges
            .pipe()
            .subscribe((value: boolean) => {

                if (value === true) {
                    this.showChildNoLongerRisk = true;
                    this.fc.date_no_longer_at_risk.setValidators([Validators.required]);

                    this.fc.date_no_longer_at_risk.updateValueAndValidity();

                    this.fc.date_no_longer_at_risk.reset();

                }
                else {

                    this.showChildNoLongerRisk = false;
                    this.fc.date_no_longer_at_risk.clearValidators();

                    this.fc.date_no_longer_at_risk.updateValueAndValidity();

                    this.fc.date_no_longer_at_risk.reset();


                }
            });
    }



    onFormSubmit(e: MouseEvent, tplContent): void {

        if (this.determinationForm.invalid) {
            return;
        }
        // this.buttonLoader = true;

        const sendData = {
            id: (this.editMode) ? this.determination.id : null,
            child: this.fc.child.value,
            determination_start_date: DateTimeHelper.getUtcDate(this.fc.determination_start_date.value),
            center: this.fc.center.value,
            certificateLink: this.fc.certificateLink.value,
            weeksAtRisk: this.fc.weeksAtRisk.value,
            riskReasons: this.fc.riskReasons.value,
            risk_to_date: DateTimeHelper.getUtcDate(this.fc.risk_to_date.value),
            additional_info: this.fc.additional_info.value,
            reason_no_third_party: this.fc.reason_no_third_party.value,
            byToStateTerritory: this.fc.byToStateTerritory.value,
            dateNoticeGiven: DateTimeHelper.getUtcDate(this.fc.dateNoticeGiven.value),
            stateTerritorySwitch: this.fc.stateTerritorySwitch.value,
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
            exceptionalReasonText: this.fc.exceptionalReasonText.value,
            extensionReasons: this.fc.extensionReasons.value,
        };

        if (this.editMode) {
            // edit determination
            this.createTplModal(tplContent, 'updateDetermination', sendData);
        }
        else {
            this.createTplModal(tplContent, 'newDetermination', sendData);
        }

    }

    updateStateTerritory(tplContent): void {
        // the "delete lines are there to delete unnecessary data,
        // that was added to the synced api data for readability in the form. these are only added to the API data not db data
        if (this.determination.determinationID) {
            delete this.determination.certificateOrDeterminationApiData;
            delete this.determination.StateTerritory;
            delete this.determination.stateTerritoryData;
            delete this.determination.riskReasons;
        }
        const sendDataStateTerritory = {
            id: (this.editMode) ? this.determination.id : null,
            center: this.fc.center.value,
            certificateAPIID: (this.determination.determinationID) ? this.determination.determinationID : null,
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
            // determination data in case its not in db.
            child: this.fc.child.value,
            apiData: this.determination

        };

        this.createTplModal(tplContent, 'StateTerritory', sendDataStateTerritory);
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
                    [submitSection === 'newDetermination' ? 'newDetermination' : submitSection === 'StateTerritory' ? 'saveStateTerritory' : 'updateDetermination'](sendData)
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

        const sendData = {
            draft: 'Save As Draft',
            id: (this.editMode) ? this.determination.id : null,
            child: this.fc.child.value,
            determination_start_date: DateTimeHelper.getUtcDate(this.fc.determination_start_date.value),
            center: this.fc.center.value,
            certificateLink: this.fc.certificateLink.value,
            weeksAtRisk: this.fc.weeksAtRisk.value,
            riskReasons: this.fc.riskReasons.value,
            risk_to_date: DateTimeHelper.getUtcDate(this.fc.risk_to_date.value),
            additional_info: this.fc.additional_info.value,
            reason_no_third_party: this.fc.reason_no_third_party.value,
            byToStateTerritory: this.fc.byToStateTerritory.value,
            dateNoticeGiven: DateTimeHelper.getUtcDate(this.fc.dateNoticeGiven.value),
            stateTerritorySwitch: this.fc.stateTerritorySwitch.value,
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
            exceptionalReasonText: this.fc.exceptionalReasonText.value,
            extensionReasons: this.fc.extensionReasons.value,
        };

        this._accsService
            .newDetermination(sendData)
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

    updateChildNoLongerRisk(tplContent): void {
        alert('coming soon');
    }

    getAgency(): string {
        return this.determination?.certificateOrDeterminationApiData?.decisionMakingAgency ? AppConst.ACCSDecisionMakingAgencyMap[this.determination?.certificateOrDeterminationApiData?.decisionMakingAgency] : 'N/A';
    }
}

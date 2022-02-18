import {Component, OnInit, ViewEncapsulation, Inject, OnDestroy} from '@angular/core';
import {helpMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {MAT_DIALOG_DATA, MatDialogRef, MatDialog} from '@angular/material/dialog';
import {AppConst} from 'app/shared/AppConst';
import {ViewWaitlistComponent} from '../view-waitlist/view-waitlist.component';
import {FormBuilder, FormGroup, FormArray, Validators, FormControl} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {CommonService} from 'app/shared/service/common.service';
import {CountryResolverService} from 'app/main/modules/waitlist-form-config/services/country-resolver.service';
import {NotificationService} from 'app/shared/service/notification.service';
import {AuthService} from 'app/shared/service/auth.service';
import {Country} from 'app/shared/model/common.interface';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import * as _ from 'lodash';
import {DeclarationDialogComponent} from 'app/main/modules/waitlist-form-config/declaration-dialog/declaration-dialog.component';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {WaitListEnrollmentService} from '../../../service/waitlist-enrollment.service';
import {FileListItem} from 'app/shared/components/s3-upload/s3-upload.model';
import {YesValidator} from 'app/shared/validators/yes-validator';
import {isArray} from 'rxjs/internal-compatibility';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';

@Component({
    selector: 'app-edit-enrolment',
    templateUrl: './edit-enrolment.component.html',
    styleUrls: ['./edit-enrolment.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class EditEnrolmentComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    otherOption = 'Other';
    waitlist: any[];
    // Form
    enrollmentForm: FormGroup; // Enrollment Form

    bookings: FormArray;
    allergiesArray: FormArray;
    currentYear: number;
    recaptchaSiteKey: string;
    isSubmitted: boolean;
    userExist: boolean;
    aboriginals: string[];
    registrationMode: boolean;
    time: string[];
    allergiesList: string[];
    emergency: string[];
    countriesList: Country[] = []; // Country Select
    religiousrequirementschecked: boolean;
    culturalrequirementschecked: boolean;
    uploadHealthRecrdChecked: boolean;
    onUploadImmunisedRecordChecked: boolean;
    onUploadPrescribedMedicineChecked: boolean;
    onUploadAnaphylaxisChecked: boolean;
    onEpipenOrAnipenChecked: boolean;
    onUploadOtherHealthChecked: boolean;
    onUploadAsthmaChecked: boolean;
    onUploadBcChecked: boolean;
    uploadCourtOrdersChecked: boolean;
    uploadTypes: string;

    datainfo: any;
    addcarer: boolean;
    dynamicMode: boolean;
    invalidAccess: boolean;
    attendanceList: any;
    allChecked: boolean;
    indeterminate: boolean;
    attendanceFormStatus: string;
    form: string;
    newbooking: any[] = [{
        address: ''

    }];
    branchDetails: any;

    // common
    buttonLoader: boolean;
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive

    _modalService: any;
    action: any;
    dialogTitle: string;
    admin_enrol: boolean;
    buttonTitle: string;
    elementSettings: any;
    allInputs: any;
    checkBoxes: any = [];

    s3Bucket: string;
    s3Path: string;
    uploadFileMap: object;
    mapOfUploadCheck: object;
    carerChecked: boolean;
    mobile: boolean = false;
    attendanceSet: boolean[] = [];
    attendanceChecked: boolean = true;
    attendanceMandatory: boolean = false;
    validForAttendance: boolean = false
    manualUploadedFiles: boolean = true;
    newSections: any
    uploadedFiles: object = []
    checkedUploading: boolean[] = [];
    uploadSwitchInputs: object = [];
    validateUploads: boolean = true
    emergencyContacts: any
    emergencyContactsAnswers: any
    waitlisDefaultData: any;
    signaturesList: any = [];
    signatureTemp: any = [];

    /**
     * @param _dialogService
     * @param _formBuilder
     * @param _route
     * @param _enrollmentService
     * @param matDialogRef
     * @param _commonService
     * @param _auth
     */

    constructor(
        public matDialogRef: MatDialogRef<ViewWaitlistComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _formBuilder: FormBuilder,
        private _route: ActivatedRoute,
        private _commonService: CommonService,
        private _notification: NotificationService,
        private _auth: AuthService,
        private _dialogService: MatDialog,
        private _enrollmentService: WaitListEnrollmentService,
        private _countryResolverService: CountryResolverService
    ) {
        this.action = _data.action;
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.ENROLMENT;

        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.dialogTitle = 'Edit Enrolment';
            this.buttonTitle = 'Update';
            this.admin_enrol = false;
        } else {
            this.dialogTitle = 'Enrol Child';
            this.admin_enrol = true;
            this.buttonTitle = 'Enrol';
        }

        this.branchDetails = this._auth.getClient();
        this.currentYear = new Date().getFullYear();
        this.buttonLoader = false;
        this.isSubmitted = false;
        this.userExist = false;
        this.religiousrequirementschecked = false;
        this.culturalrequirementschecked = false;
        this.uploadHealthRecrdChecked = false;
        this.onUploadImmunisedRecordChecked = false;
        this.onUploadPrescribedMedicineChecked = false;
        this.onUploadAnaphylaxisChecked = false;
        this.onEpipenOrAnipenChecked = false;
        this.onUploadOtherHealthChecked = false;
        this.onUploadAsthmaChecked = false;
        this.onUploadBcChecked = false;
        this.uploadCourtOrdersChecked = false;

        this.allInputs = AppConst.modalActionTypes.NEW === this.action ? [].concat(..._.map(this._data.response.settings, (val: any, idx: number) => val.inputs)) : this._data.response.enrolitem.waitlist_info.new_inputs.filter(i => i.section !== '');
        this.newSections = AppConst.modalActionTypes.NEW === this.action ? this._data.response.settings : _.sortBy(this._data.response.enrolitem.waitlist_info.section_inputs['enrolment'], 'order');
        this.uploadedFiles = (this._data.response.enrolitem.waitlist_info.upload_files) ? this._data.response.enrolitem.waitlist_info.upload_files : [];
        this.waitlisDefaultData = this._data?.response?.enrolitem?.waitlist_info;

        this.aboriginals = [
            'Aboriginal not TS Islander',
            'TS Islander not Aboriginal',
            'Aboriginal and TS Islander',
            'Not Aboriginal nor TS Islander',
            'Not stated'
        ];
        this.time = [
            'AM',
            'PM',
            'All Day'
        ];

        /*this.allergiesList = [
            'Anaphylaxis',
            'Allergy',
            'Asthma',
            'Diabetes',
            'Special dietary requirements',
            'Sunscreen requirements',
            'Other'
        ];*/
        this.allergiesList = _data.response.allergyTypes;
        // console.log('_data.response.allergyTypes')
        // console.log(_data.response.allergyTypes)
        this.emergency = [
            'Collection',
            'Emergency',
            'Medical',
            'Excursion'
        ];

        this.dynamicMode = false;
        this.invalidAccess = false;
        this.addcarer = false;
        this.enrollmentForm = this._formBuilder.group({});
        if (this.allInputs !== undefined && this.allInputs?.length > 0) {
            this._allInputsValidate()
        }

        this.uploadFileMap = this._data?.response?.enrolitem?.waitlist_info?.upload_files || {};
        this.mapOfUploadCheck = {};
        this.uploadTypes = 'image/*, application/pdf';
        this.form = 'enrolment';
        this.carerChecked = false;
        if (window.screen.width < 415) {
            this.mobile = true;
        }
        this.preferedDays();
        const dd = [];
        this.newSections[this.newSections.findIndex(x => x.code === 'emergency_contact_details')]['inputs'].forEach(x => {
            const name = !_.isEmpty(x.name) ? x.name : x;
            dd.push({
                name: name,
                data: this.allInputs[this.allInputs.findIndex(y => y.name === name)]
            })
        })
        // dd.push({
        //     name: 'addEmergencyContact',
        //     data: this.allInputs[this.allInputs.findIndex(y => y.name === 'addEmergencyContact')]['values']
        // })
        this._enrollmentService.setEmergencyContactsSettings(dd)
        this.emergencyContacts = dd;
        this.emergencyContactsCheckBoxSet();
        this._unsubscribeAll = new Subject();
    }

    preferedDays(): void {
        const attendanceIndex = this.allInputs.findIndex(i => i.name === 'preferedDate')
        if (attendanceIndex !== -1 && this.allInputs[attendanceIndex].required === true) {
            this.validForAttendance = true;
        }
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     *  On Init
     */
    ngOnInit(): void {

        this._setInitData();
        this._setScrollDirective();
        if (!this.admin_enrol) {
            this.setVlaues();
        } else {
            this.setWaitlistValues();
        }
        this._countryResolverService
            .resolve()
            .pipe()
            .subscribe((value: any) => {
                    this.countriesList = value[0];
                }
            )
        this.enrollmentForm.valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                (data) => {
                    if (!this.carerChecked && data.carer_firstname !== '' && data.carer_firstname !== undefined) {
                        this.additionalCarerValidationChange(true);
                    } else if (this.carerChecked && data.carer_firstname === '' && data.carer_firstname !== undefined) {
                        this.additionalCarerValidationChange(false);
                    }
                }
            )
        this.uploadsInputsValidate();
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    uploadsInputsValidate(): void {
        this.allInputs.forEach(x => {
            if (x.input_type === 'upload-switch' && x.section !== '') {
                this.uploadSwitchInputs[x.name] = {
                    name: x.name,
                    required: x.types?.fileUploadRequired !== undefined && x.types.fileUploadRequired
                };
                if (typeof this.uploadedFiles[x.name] !== 'undefined' && Array.isArray(this.uploadedFiles[x.name]) && (this.uploadedFiles[x.name]).length > 0) {
                    this.checkedUploading[x.input_name || x.name] = true;
                } else {
                    this.checkedUploading[x.input_name || x.name] = null;
                }
            }
        })
    }

    _setScrollDirective() {
        this._commonService.verticalLayout1ScrollDirective
            .pipe()
            .subscribe((directive: FusePerfectScrollbarDirective | null) => {
                this.scrollDirective = directive;
            });
    }

    /**
     * Afer View Init
     */
    ngAfterViewInit(): void {
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * disable future dates
     *
     */
    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }

    /**
     * disable past dates
     *
     */
    disabledPastDates = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, new Date()) < 0;
    }

    /**
     * Set select data
     */
    _setInitData(): void {
        this.validForAttendance = true;
        this.attendanceSet[0] = true;
        const resolveData = this._route.snapshot.data['countryList'];
        if (!_.isEmpty(resolveData)) {
            this.countriesList = resolveData[0];
        }
    }

    onCulturalRequirement(mode: boolean): void {
        this.culturalrequirementschecked = !!mode;
    }

    onReligiousRequirementsChange(mode: boolean): void {
        this.religiousrequirementschecked = !!mode;
    }

    onUploadHealthRecord(mode: boolean, name: string): void {
        this.uploadHealthRecrdChecked = !!mode;
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['healthRecord'] = mode;
        this.fileUploadCheck(!mode, name);
    }

    onUploadImmunisedRecord(mode: boolean, name: string): void {
        this.onUploadImmunisedRecordChecked = !!mode;
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['childImmunised'] = mode;
        this.fileUploadCheck(!mode, name);
    }

    onUploadPrescribedMedicine(mode: boolean, name: string): void {
        this.onUploadPrescribedMedicineChecked = !!mode;
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['prescribedMedicine'] = mode;
        this.fileUploadCheck(!mode, name);
    }

    onUploadAnaphylaxis(mode: boolean, name: string): void {
        this.onUploadAnaphylaxisChecked = !!mode;
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['anaphylaxis'] = mode;
        this.fileUploadCheck(!mode, name);
    }

    onEpipenOrAnipen(mode: boolean, name: string): void {
        this.onEpipenOrAnipenChecked = !!mode;
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['epipenOrAnipen'] = mode;
        this.fileUploadCheck(!mode, name);
    }

    onUploadOtherHealth(mode: boolean, name: string): void {
        this.onUploadOtherHealthChecked = !!mode;
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['healthConditions'] = mode;
        this.fileUploadCheck(!mode, name);
    }

    onUploadAsthma(mode: boolean, name: string): void {

        this.onUploadAsthmaChecked = !!mode;
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['asthma'] = mode;
        this.fileUploadCheck(!mode, name);
    }

    onUploadBc(mode: boolean, name: string): void {
        this.onUploadBcChecked = !!mode;
        // console.log('this.onUploadBcChecked')
        // console.log(this.onUploadBcChecked)
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['birthCertificate'] = mode;
        this.fileUploadCheck(!mode, name);
    }

    onUploadCourtOrders(mode: boolean, name: string): void {
        this.uploadCourtOrdersChecked = !!mode;
        this.checkedUploading[name] = null;
        this.mapOfUploadCheck['courtAppointed'] = mode;
        this.fileUploadCheck(!mode, name);
    }


    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */

    _allInputsValidate(): void {
        // console.log('this.allInputs')
        // console.log(this.allInputs)
        this.allInputs.forEach(x => {
            if (x['section'] !== '') {

                const answer = AppConst.modalActionTypes.NEW === this.action ? !_.isEmpty(this._data.response.enrolitem.waitlist_info.new_inputs.find(i => i.waitlist_section !== '' && i.name === x['name'])) ? this._data.response.enrolitem.waitlist_info.new_inputs.find(i => i.waitlist_section !== '' && i.name === x['name']).values : '' : !_.isEmpty(this._data.response.enrolitem.waitlist_info.new_inputs.find(i => i.section !== '' && i.name === x['name'])) ? this._data.response.enrolitem.waitlist_info.new_inputs.find(i => i.section !== '' && i.name === x['name']).values : '';

                if (x['section'] === 'emergency_contact_details') {
                    if (x['name'] === 'addEmergencyContact') {
                        this.enrollmentForm.addControl('addEmergencyContact', this._formBuilder.array([]))
                    }
                    // this.enrollmentForm.addControl('addEmergencyContact', null)
                } else if (x['input_type'] === 'textboxArray' && x['name'] === 'addAllergy') {
                    this.enrollmentForm.addControl('addAllergy', this._formBuilder.array([]))
                } else if ('culturalRequirements' === x['name']) {
                    this.enrollmentForm.addControl(x['name'], new FormControl(answer === '' || answer === null || answer === false ? false : answer, x['required'] ? YesValidator.YesOnly : null))
                    this.enrollmentForm.addControl('cultuaral_requirements_switch', new FormControl(this.waitlisDefaultData.cultural_requirement, (x['required']) ? [Validators.required, Validators.maxLength(150)] : Validators.maxLength(150)))
                } else if ('religiousRequirements' === x['name']) {
                    this.enrollmentForm.addControl(x['name'], new FormControl(answer === '' || answer === null || answer === false ? false : answer, x['required'] ? YesValidator.YesOnly : null))
                    this.enrollmentForm.addControl('religious_requirements_switch', new FormControl(this.waitlisDefaultData.religious_requirements, (x['required']) ? [Validators.required, Validators.maxLength(150)] : Validators.maxLength(150)))
                } else if (x['input_type'] === 'text-area') {
                    this.enrollmentForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required, Validators.maxLength(250)] : Validators.maxLength(250)))
                } else if (x['input_type'] === 'select-checkbox' && x['name'] === 'preferedDate') {
                    this.enrollmentForm.addControl(x['name'], this._formBuilder.array([]))
                } else if ('crn' === x['name'] || 'parentprimaryCarer' === x['name'] || 'addtionalprimaryCarer' === x['name']) {
                    this.enrollmentForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required, Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')] : [Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')]))
                } else if (x['input_type'] === 'textbox') {
                    this.enrollmentForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required, Validators.maxLength(150)] : Validators.maxLength(150)))
                } else if (x['input_type'] === 'switch' || x['input_type'] === 'checkbox') {
                    this.enrollmentForm.addControl(x['name'], new FormControl(answer === '' || answer === null || answer === false ? false : answer, x['required'] ? YesValidator.YesOnly : null))
                } else if (x['input_type'] === 'select-multiple') {
                    this.enrollmentForm.addControl(x['name'], new FormControl(answer === '' || answer === null || answer === false ? [] : answer, (x['required']) ? [Validators.required] : null))
                } else {
                    this.enrollmentForm.addControl(x['name'], new FormControl(answer, (x['required']) ? Validators.required : null))
                }
                /*checkbox - selected multiple option defualt set on array for use update data collection*/
                if (x['input_type'] === 'checkbox' && typeof answer !== 'boolean' && answer !== null && Array.isArray((answer)) && (answer).length > 0) {
                    // @ts-ignore
                    for (const i of answer) {
                        this.checkBoxes.push({
                            name: x['name'],
                            value: i
                        });
                    }

                }

                if ('signature' === x.input_type) {
                    this.signaturesList.push({
                        name: x['name'],
                        required: x['required'],
                        section: x['section'],
                        value: answer
                    });
                }
            }
        })
    }

    emergencyContactsCheckBoxSet(): void {
        this.emergencyContactsAnswers = !_.isEmpty(this.emergencyContacts[this.emergencyContacts.findIndex(y => y.name === 'addEmergencyContact')]?.data) ? this.emergencyContacts[this.emergencyContacts.findIndex(y => y.name === 'addEmergencyContact')]['data']['values'] : [];
        if (!isArray(this.emergencyContactsAnswers) || this.emergencyContactsAnswers.length === 0) {
            return;
        }
        this.emergencyContacts.forEach(x => {
            if (x.data['input_type'] === 'checkbox') {


                this.emergencyContactsAnswers.forEach((value, key) => {


                    if (x.data['types']['multiple'] === true) {
                        for (const i of this.emergencyContactsAnswers[key][x.name]) {
                            this.checkBoxes.push({
                                name: x['name'] + '_em_' + key,
                                value: i
                            });
                        }
                    }
                })
            }
        })
    }


    addBookingGroup(): FormGroup {

        return this._formBuilder.group({
            mornings: [''],
            monday: [false],
            tuesday: [false],
            wednesday: [false],
            thursday: [false],
            friday: [false],
            allDays: [false],
            // saturday: [false],
            // sunday: [false]

        });
    }

    get bookingArray() {
        return this.enrollmentForm.get('preferedDate') as FormArray;
    }

    addBooking() {
        this.bookingArray.push(this.addBookingGroup());
        this.validForAttendance = false;
    }

    removeBooking(index) {
        this.bookingArray.removeAt(index);
    }

    //----------Allergies---------------

    addAllergyGroup(): FormGroup {
        return this._formBuilder.group({
            allergies: [''],
            detailsOfAllergies: [''],
        });
    }

    get allergyArray() {
        return this.enrollmentForm.get('addAllergy') as FormArray;
    }

    addAllergy() {
        this.allergyArray.push(this.addAllergyGroup());
    }

    removeAllergy(index) {
        this.allergyArray.removeAt(index);
    }

    //-----Emergency-Contacts----------------

    addEmergencyGroup(): FormGroup {
        const dd = [];
        this.newSections[this.newSections.findIndex(x => x.code === 'emergency_contact_details')]['inputs'].forEach(x => {
            const name = !_.isEmpty(x.name) ? x.name : x;
            dd.push({
                name: name,
                data: this.allInputs[this.allInputs.findIndex(y => y.name === name)]
            })
        })
        this.emergencyContacts = dd
        const fields = {};

        this.emergencyContacts.forEach((g, key) => {
                if (g.name === 'emenrgencyPhone') {
                    Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.required, Validators.max(9999999999), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]] : ['', [Validators.max(9999999999), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]]});
                } else if (g.data['input_type'] === 'textbox') {
                    Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.required, Validators.maxLength(250)]] : ['', [Validators.maxLength(250)]]});
                } else if (g.data['input_type'] === 'date-picker') {
                    Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.required]] : ['', null]});
                } else if (g.data['input_type'] === 'email') {
                    Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.email, Validators.required, Validators.maxLength(150)]] : ['', [Validators.maxLength(150), Validators.email]]});
                } else if (g.data['input_type'] === 'checkbox') {
                    Object.assign(fields, {[g.name]: [false, []]});
                } else if (g.data['input_type'] === 'select-multiple') {
                    Object.assign(fields, {[g.name]: g.data['required'] ? [[], [Validators.required]] : [[], []]});
                } else if (g.data['input_type'] === 'text-area') {
                    Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.required]] : ['', []]});
                } else if (g.data['input_type'] === 'switch') {
                    Object.assign(fields, {[g.name]: [false, []]});
                } else {
                    Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.required]] : ['', []]});
                }
            }
        )
        return this._formBuilder.group(fields);
    }

    get emergencyContactsArray() {
        return this.enrollmentForm.get('addEmergencyContact') as FormArray;
    }

    addEmergencyContact() {
        this.emergencyContactsArray.push(this.addEmergencyGroup());
    }

    removeEmergencyContact(index) {
        this.emergencyContactsArray.removeAt(index);
    }


    //-----------------------------------

    addCarer() {
        this.addcarer = true;
    }

    removeCarer() {
        this.addcarer = false;
    }

    setVlaues() {

        if (this._data.response.enrolitem.waitlist_info.bookings.length > 0) {
            let i = 0;
            this._data.response.enrolitem.waitlist_info.bookings.forEach(x => {
                this.bookingArray.push(this.addBookingGroup());
                this.attendanceSet[i++] = true;
            })
        }
        if (this._data.response.enrolitem.waitlist_info.emergencyContacts.length > 0) {
            this._data.response.enrolitem.waitlist_info.emergencyContacts.forEach(x => {
                this.emergencyContactsArray.push(this.addEmergencyGroup());
            })
        }
        if (this._data.response.enrolitem.waitlist_info.allergiesArray.length > 0) {
            this._data.response.enrolitem.waitlist_info.allergiesArray.forEach(x => {
                this.allergyArray.push(this.addAllergyGroup());
            })
        }

        this.enrollmentForm.patchValue(this._data.response.enrolitem.waitlist_info);
        if (!_.isEmpty(this._data.response.enrolitem.waitlist_info.allergiesArray)) {
            this.enrollmentForm.get('addAllergy').patchValue(this._data.response.enrolitem.waitlist_info.allergiesArray, {emitEvent: false});
        }
        if (!_.isEmpty(this._data.response.enrolitem.waitlist_info.bookings)) {
            this.enrollmentForm.get('preferedDate').patchValue(this._data.response.enrolitem.waitlist_info.bookings, {emitEvent: false});
        }
        this.enrollmentForm.get('addEmergencyContact').patchValue(this._data.response.enrolitem.waitlist_info.emergencyContacts, {emitEvent: false})
        this.addCarer()
        if (this._data.response.enrolitem.waitlist_info.cultural_requirement_chk === 1) {
            this.culturalrequirementschecked = true;
        }
        if (this._data.response.enrolitem.waitlist_info.religious_requirements_chk === 1) {
            this.religiousrequirementschecked = true;
        }
    }

    setWaitlistValues(): void {
        this.emergencyContactsArray.push(this.addEmergencyGroup());
        if (typeof (this.bookingArray) === 'object' && this.bookingArray !== null) {
            this.bookingArray.push(this.addBookingGroup());

            this.enrollmentForm.get('preferedDate').patchValue([{
                monday: !_.isEmpty(this._data.response.enrolitem.waitlist_info.bookings) ? this._data.response.enrolitem.waitlist_info.bookings['monday'] : false,
                tuesday: !_.isEmpty(this._data.response.enrolitem.waitlist_info.bookings) ? this._data.response.enrolitem.waitlist_info.bookings['tuesday'] : false,
                wednesday: !_.isEmpty(this._data.response.enrolitem.waitlist_info.bookings) ? this._data.response.enrolitem.waitlist_info.bookings['wednesday'] : false,
                thursday: !_.isEmpty(this._data.response.enrolitem.waitlist_info.bookings) ? this._data.response.enrolitem.waitlist_info.bookings['thursday'] : false,
                friday: !_.isEmpty(this._data.response.enrolitem.waitlist_info.bookings) ? this._data.response.enrolitem.waitlist_info.bookings['friday'] : false,
                allDays: !_.isEmpty(this._data.response.enrolitem.waitlist_info.bookings) ? this._data.response.enrolitem.waitlist_info.bookings['allDays'] : false,
                // saturday: this._data.response.enrolitem.waitlist_info.bookings['saturday'],
                // sunday: this._data.response.enrolitem.waitlist_info.bookings['sunday'],
            }], {emitEvent: false});
        }
    }

    /**
     * Open terms dialog
     */
    openTermsDialog(): void {

        const dialogRef = this._dialogService.open(DeclarationDialogComponent, {disableClose: true});

    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.enrollmentForm.controls;
    }

    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }

        this.enrollmentForm.reset();

        for (const key in this.fc) {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

    }

    invalidget() {
        const invalid = [];
        const controls = this.enrollmentForm.controls;
        for (const name in controls) {
            if (controls[name].invalid) {
                invalid.push(name);
            }
        }
        console.log(invalid)
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */
    onFormSubmit(e: MouseEvent): void {
        e.preventDefault();

        // return;
        this.invalidget();
        if (this.enrollmentForm.invalid) {
            return;
        }

        this.getEmergencyArrayFinal()
        const tot = [];/* selected checkboxes values for input fields*/
        for (const y of this.allInputs) {
            const adjust = [];
            for (const i of this.checkBoxes) {
                // @ts-ignore
                if (y.name === i.name) {
                    adjust.push(i.value);
                }
            }
            // @ts-ignore
            tot[y.name] = (adjust)

            /* signatures fill */
            // for (const i of this.signaturesList) {
            //     if (y.name === i.name) {
            //         tot[y.name] = i.value;
            //     }
            // }
        }

        const updatedAllInputs = [];
        if (this.allInputs?.length > 0) {
            this.allInputs.forEach(x => {
                let answer = {};
                if (x['name'] === 'preferedDate') {
                    answer = {
                        values: ((this.fc.preferedDate.value !== undefined) ? this.fc.preferedDate.value : []),
                        name: x['name']
                    }
                } else if (x['name'] === 'addAllergy') {
                    answer = {
                        values: ((this.fc.addAllergy.value !== undefined) ? this.fc.addAllergy.value : []),
                        name: x['name']
                    }
                } else if (x['name'] === 'addEmergencyContact') {
                    answer = {
                        // values: ((this.fc.addEmergencyContact.value !== undefined) ? this.fc.addEmergencyContact.value : []),
                        values: this.fc.addEmergencyContact?.value === undefined ? null : this.fc.addEmergencyContact.value,
                        name: x['name']
                    }
                } else {
                    answer = {
                        values: (tot[x['name']].length > 0) ? tot[x['name']] : (x['section'] !== '') ? this.enrollmentForm.controls[x['name']]?.value === undefined ? '' : this.enrollmentForm.controls[x['name']].value : '',
                        name: x['name']
                    }
                }
                updatedAllInputs.push(answer)

            })
        }

        // this.buttonLoader = true;
        const sendData = {
            waitlist_id: ((this._data.response.enrolitem) ? this._data.response.enrolitem.id : ''),
            child_first_name: _.isEmpty(this.fc.firstname) ? null : this.fc.firstname.value ?? '',
            child_middle_name: _.isEmpty(this.fc.middlename) ? null : this.fc.middlename.value,
            child_last_name: _.isEmpty(this.fc.lastname) ? null : this.fc.lastname.value,
            child_dob: _.isEmpty(this.fc.dateOfBirth) ? null : DateTimeHelper.getUtcDate(this.fc.dateOfBirth.value),
            child_crn: _.isEmpty(this.fc.crn) ? null : this.fc.crn.value,
            sibilings: _.isEmpty(this.fc.siblingAttend) ? null : this.fc.siblingAttend.value,
            child_enrolment_date: _.isEmpty(this.fc.startDate) ? null : DateTimeHelper.getUtcDate(this.fc.startDate.value),
            child_gender: this.fc.childGender.value,
            child_address: _.isEmpty(this.fc.childAddress) ? null : this.fc.childAddress.value,
            child_state: _.isEmpty(this.fc.child_state) ? null : this.fc.child_state.value,
            child_suburb: _.isEmpty(this.fc.childSuburb) ? null : this.fc.childSuburb.value,
            child_postcode: _.isEmpty(this.fc.childPostcode) ? null : this.fc.childPostcode.value,

            courtorders_chk: _.isEmpty(this.fc.courtAppointed) ? null : this.fc.courtAppointed.value,
            // child_enrollment_start_date: this.fc.enrollment_start_date.value,
            parent_first_name: _.isEmpty(this.fc.parentFirstname) ? null : this.fc.parentFirstname.value,
            parent_middle_name: _.isEmpty(this.fc.parentmiddlename) ? null : this.fc.parentmiddlename.value,
            parent_last_name: _.isEmpty(this.fc.parentlastname) ? null : this.fc.parentlastname.value,
            parent_dob: _.isEmpty(this.fc.parentdateOfBirth) ? null : DateTimeHelper.getUtcDate(this.fc.parentdateOfBirth.value),
            parent_email: _.isEmpty(this.fc.parentEmail) ? null : this.fc.parentEmail.value,
            parent_address: _.isEmpty(this.fc.parentAddress) ? null : this.fc.parentAddress.value,
            parent_suburb: _.isEmpty(this.fc.parentSuburb) ? null : this.fc.parentSuburb.value,
            parent_country: _.isEmpty(this.fc.parentCountry) ? null : this.fc.parentCountry.value,
            parent_postalCode: _.isEmpty(this.fc.parentPC) ? null : this.fc.parentPC.value,
            parent_state: _.isEmpty(this.fc.parentState) ? null : this.fc.parentState.value,
            parent_phone: _.isEmpty(this.fc.parentPhone) ? null : this.fc.parentPhone.value,
            parent_mobile: _.isEmpty(this.fc.parentMobile) ? null : this.fc.parentMobile.value,
            bookings: _.isEmpty(this.fc.preferedDate) ? null : this.fc.preferedDate.value,
            allergiesArray: _.isEmpty(this.fc.addAllergy) ? null : this.fc.addAllergy.value,
            child_circumstances: _.isEmpty(this.fc.childCircumstances) ? null : this.fc.childCircumstances.value,
            child_aboriginal: _.isEmpty(this.fc.straitIslande) ? null : this.fc.straitIslande.value,
            cultural_background: _.isEmpty(this.fc.culturalBackground) ? null : this.fc.culturalBackground.value,
            spoken_language: _.isEmpty(this.fc.spokenHome) ? null : this.fc.spokenHome.value,
            cultural_requirement_chk: _.isEmpty(this.fc.culturalRequirements) ? null : this.fc.culturalRequirements.value,
            cultural_requirement: _.isEmpty(this.fc.cultuaral_requirements_switch) ? null : this.fc.cultuaral_requirements_switch.value,
            religious_requirements_chk: _.isEmpty(this.fc.religiousRequirements) ? null : this.fc.religiousRequirements.value,
            religious_requirements: _.isEmpty(this.fc.religious_requirements_switch) ? null : this.fc.religious_requirements_switch.value,
            // expected_start_date: this.fc.expected_start_date.value,
            // mornings
            child_medical_number: _.isEmpty(this.fc.medicareNumber) ? null : this.fc.medicareNumber.value,
            child_medicalexpiry_date: _.isEmpty(this.fc.medicareExopiry) ? null : DateTimeHelper.getUtcDate(this.fc.medicareExopiry.value),
            ambulance_cover_no: _.isEmpty(this.fc.ambulanceCover) ? null : this.fc.ambulanceCover.value,
            child_heallth_center: _.isEmpty(this.fc.healthCentre) ? null : this.fc.healthCentre.value,
            practitioner_name: _.isEmpty(this.fc.medicalService) ? null : this.fc.medicalService.value,
            practitioner_address: _.isEmpty(this.fc.medicalServiceAddress) ? null : this.fc.medicalServiceAddress.value,
            practitioner_phoneNo: _.isEmpty(this.fc.medicalServicePhone) ? null : this.fc.medicalServicePhone.value,
            health_record_chk: _.isEmpty(this.fc.healthRecord) ? null : this.fc.healthRecord.value,
            immunised_chk: _.isEmpty(this.fc.childImmunised) ? null : this.fc.childImmunised.value,
            prescribed_medicine_chk: _.isEmpty(this.fc.prescribedMedicine) ? null : this.fc.prescribedMedicine.value,
            detailsOfAllergies: _.isEmpty(this.fc.detailsOfAllergies) ? null : this.fc.detailsOfAllergies.value,
            anaphylaxis_chk: _.isEmpty(this.fc.anaphylaxis) ? null : this.fc.anaphylaxis.value,
            birth_certificate: _.isEmpty(this.fc.birthCertificate) ? null : this.fc.birthCertificate.value,
            asthma_chk: _.isEmpty(this.fc.asthma) ? null : this.fc.asthma.value,
            other_health_conditions_chk: _.isEmpty(this.fc.healthConditions) ? null : this.fc.healthConditions.value,
            epipen_chk: _.isEmpty(this.fc.epipenOrAnipen) ? null : this.fc.epipenOrAnipen.value,
            //parent new details:
            relationship: _.isEmpty(this.fc.emenrgencyRelationship) ? null : this.fc.emenrgencyRelationship.value,
            work_address: _.isEmpty(this.fc.parentWorkAddress) ? null : this.fc.parentWorkAddress.value,
            work_phone: _.isEmpty(this.fc.parentWorkPN) ? null : this.fc.parentWorkPN.value,
            parentWorkMob: _.isEmpty(this.fc.parentWorkMob) ? null : this.fc.parentWorkMob.value,
            work_email: _.isEmpty(this.fc.parentWorkEmailAddress) ? null : this.fc.parentWorkEmailAddress.value,
            occupation: _.isEmpty(this.fc.parentOccupation) ? null : this.fc.parentOccupation.value,
            consent_incursion: null,
            consent_make_medical_decision: null,
            consent_emergency_contact: null,
            consent_collect_child: null,
            parent_spoken_language: _.isEmpty(this.fc.parentSH) ? null : this.fc.parentSH.value,
            parent_cultural_background: _.isEmpty(this.fc.parentCB) ? null : this.fc.parentCB.value,
            parent_aboriginal: _.isEmpty(this.fc.parentStraitIslande) ? null : this.fc.parentStraitIslande.value,
            parent_crn: _.isEmpty(this.fc.parentprimaryCarer) ? null : this.fc.parentprimaryCarer.value,
            // carer details
            carer_relationship: (this.addcarer) ? _.isEmpty(this.fc.carer_relationship) ? null : this.fc.carer_relationship.value : '',
            carer_firstname: (this.addcarer) ? _.isEmpty(this.fc.addtionalFirstname) ? null : this.fc.addtionalFirstname.value : '',
            carer_middlename: (this.addcarer) ? _.isEmpty(this.fc.addtionalmiddlename) ? null : this.fc.addtionalmiddlename.value : '',
            carer_lastname: (this.addcarer) ? _.isEmpty(this.fc.addtionallastname) ? null : this.fc.addtionallastname.value : '',
            carer_dob: (this.addcarer) ? _.isEmpty(this.fc.addtionaldateOfBirth) ? null : DateTimeHelper.getUtcDate(this.fc.addtionaldateOfBirth.value) : '',
            carer_email: (this.addcarer) ? _.isEmpty(this.fc.carerEmail) ? null : this.fc.carerEmail.value : '',
            carer_address: (this.addcarer) ? _.isEmpty(this.fc.addtionalAddress) ? null : this.fc.addtionalAddress.value : '',
            carer_suburb: (this.addcarer) ? _.isEmpty(this.fc.addtionalSuburb) ? null : this.fc.addtionalSuburb.value : '',
            carer_country: (this.addcarer) ? _.isEmpty(this.fc.additionalCarerCountry) ? null : this.fc.additionalCarerCountry.value : '',
            carer_postalCode: (this.addcarer) ? _.isEmpty(this.fc.addtionalPC) ? null : this.fc.addtionalPC.value : '',
            carer_state: (this.addcarer) ? _.isEmpty(this.fc.addtionalState) ? null : this.fc.addtionalState.value : '',
            carer_phone: (this.addcarer) ? _.isEmpty(this.fc.addtionalPhone) ? null : this.fc.addtionalPhone.value : '',
            carer_mobile: (this.addcarer) ? _.isEmpty(this.fc.addtionalMobile) ? null : this.fc.addtionalMobile.value : '',
            carer_work_address: (this.addcarer) ? _.isEmpty(this.fc.addtionalWorkAddress) ? null : this.fc.addtionalWorkAddress.value : '',
            carer_work_phone: (this.addcarer) ? _.isEmpty(this.fc.addtionalWorkPN) ? null : this.fc.addtionalWorkPN.value : '',
            carer_work_mob: (this.addcarer) ? _.isEmpty(this.fc.addtionalWorkMN) ? null : this.fc.addtionalWorkMN.value : '',
            carer_work_email: (this.addcarer) ? _.isEmpty(this.fc.addtionalWorkEmailAddress) ? null : this.fc.addtionalWorkEmailAddress.value : '',
            carer_occupation: (this.addcarer) ? _.isEmpty(this.fc.addtionalOccupation) ? null : this.fc.addtionalOccupation.value : '',
            carer_consent_incursion: (this.addcarer) ? null : '',
            care_consent_mak_medi_deci: (this.addcarer) ? null : '',
            care_consent_eme_contact: (this.addcarer) ? null : '',
            carer_consent_collect_child: (this.addcarer) ? null : '',
            carer_spoken_language: (this.addcarer) ? _.isEmpty(this.fc.addtionalSH) ? null : this.fc.addtionalSH.value : '',
            carer_cultural_background: (this.addcarer) ? _.isEmpty(this.fc.addtionalCB) ? null : this.fc.addtionalCB.value : '',
            carer_aboriginal: (this.addcarer) ? _.isEmpty(this.fc.addtionalStraitIslande) ? null : this.fc.addtionalStraitIslande.value : '',
            addition_carer_crn: _.isEmpty(this.fc.addtionalprimaryCarer) ? null : this.fc.addtionalprimaryCarer.value,
            emergency: _.isEmpty(this.fc.addEmergencyContact) ? null : this.fc.addEmergencyContact.value,

            //additional consents
            consent1: _.isEmpty(this.fc.consent1) ? null : this.fc.consent1.value,
            consent2: _.isEmpty(this.fc.consent2) ? null : this.fc.consent2.value,
            consent3: _.isEmpty(this.fc.consent3) ? null : this.fc.consent3.value,
            consent4: _.isEmpty(this.fc.consent4) ? null : this.fc.consent4.value,
            consent5: _.isEmpty(this.fc.consent5) ? null : this.fc.consent5.value,
            consent6: _.isEmpty(this.fc.consent6) ? null : this.fc.consent6.value,
            consent7: _.isEmpty(this.fc.consent7) ? null : this.fc.consent7.value,
            consent8: _.isEmpty(this.fc.consent8) ? null : this.fc.consent8.value,
            nappyChange: _.isEmpty(this.fc.nappyChange) ? null : this.fc.nappyChange.value,
            bottleFeed: _.isEmpty(this.fc.bottleFeed) ? null : this.fc.bottleFeed.value,
            updatedAllInputs: updatedAllInputs,
            upload_files: this.finalizeUploadFiles()

        };

        // console.log(updatedAllInputs);
        // console.log(this.admin_enrol);
        // return;
        this.buttonLoader = true;
        if (this.admin_enrol) {
            this._enrollmentService.enrollChild(sendData)
                .pipe(
                    takeUntil(this._unsubscribeAll)
                )
                .subscribe((code: string) => {
                    this.buttonLoader = false;
                    if (!code) {
                        return;
                    }
                    setTimeout(() => this.matDialogRef.close(code), 250);

                    setTimeout(() => {
                        this.isSubmitted = true;
                        if (this.scrollDirective) {
                            this.scrollDirective.scrollToTop();
                        }
                    }, 300);
                });
        } else {
            this._enrollmentService.updateWailistEnrolment(sendData)
                .pipe(
                    takeUntil(this._unsubscribeAll)
                )
                .subscribe((code: string) => {
                    this.buttonLoader = false;
                    if (!code) {
                        return;
                    }
                    setTimeout(() => this.matDialogRef.close(code), 250);

                    setTimeout(() => {
                        this.isSubmitted = true;
                        if (this.scrollDirective) {
                            this.scrollDirective.scrollToTop();
                        }
                    }, 300);
                });
        }


    }

    getEmergencyArrayFinal(): any {

        const fieled = {};
        /*mandatory emergency default*/
        this.fc.addEmergencyContact.value.forEach((set, mainkey) => {
            Object.entries(set).forEach(([key, value]) => {
                const adjust = [];
                for (const i of this.checkBoxes) {
                    if (key + '_em_' + mainkey === i.name) {
                        adjust.push(i.value);
                    }
                }
                if (adjust.length > 0) {
                    this.enrollmentForm.get('addEmergencyContact.' + mainkey + '.' + key).patchValue(adjust, {emitEvent: false});
                }
            })
        })
    }

    checkedFieldsGet(data: { event: boolean, name: string, value: string, sectionCode: string }): void {
        if (data.event) {
            this.checkBoxes.push({
                name: data.name,
                value: data.value
            });
            this.enrollmentForm.get(data.name).patchValue(true, {emitEvent: false});
        } else {
            this.checkBoxes.splice(this.checkBoxes.indexOf(data.value), 1);
        }
    }

    handleUploadChange(fileList: FileListItem[], inputName: string): void {
        this.checkedUploading[inputName] = (fileList === null) ? false : true;
        this.manualUploadedFiles = Object.values(this.checkedUploading).indexOf(false) > -1 ? false : true;
        this.uploadFileMap[inputName] = _.map(fileList, 'key');
    }

    uploadVisibility(name: string): boolean {
        return this._data?.response?.enrolitem?.waitlist_info?.[name] === 1 || this._data?.response?.enrolitem?.waitlist_info?.[name] === true ? true : false;
    }

    getDefaultFiles(name: string): any {
        const files = this._data?.response?.enrolitem?.waitlist_info?.upload_files?.[name];
        return files ? files : [];
    }

    finalizeUploadFiles(): any {
        return _.omit(this.uploadFileMap, _.keys(_.pickBy(this.mapOfUploadCheck, (value, key) => {
            if (value === false) {
                return true
            }
        })));
    }

    additionalCarerValidationChange(permission): void {
        if (permission) {
            this.carerChecked = true;
            this.elementSettings.carer_lastname.required = 0;
            this.elementSettings.carer_email.required = 0;
            this.elementSettings.carer_dob.required = 0;

            this.enrollmentForm.controls['carer_lastname'].setValidators([Validators.required, Validators.pattern('^[a-zA-Z ]+$'), Validators.maxLength(150)]);
            this.enrollmentForm.controls['carer_email'].setValidators([Validators.required, Validators.email, Validators.maxLength(150)]);
            this.enrollmentForm.controls['carer_dob'].setValidators(Validators.required);

            this.enrollmentForm.controls['carer_lastname'].updateValueAndValidity();
            this.enrollmentForm.controls['carer_email'].updateValueAndValidity();
            this.enrollmentForm.controls['carer_dob'].updateValueAndValidity();
        } else {
            this.carerChecked = false;
            this.elementSettings.carer_lastname.required = 1;
            this.elementSettings.carer_email.required = 1;
            this.elementSettings.carer_dob.required = 1;

            this.enrollmentForm.controls['carer_lastname'].setValidators([Validators.pattern('^[a-zA-Z ]+$'), Validators.maxLength(150)]);
            this.enrollmentForm.controls['carer_email'].clearValidators();
            this.enrollmentForm.controls['carer_dob'].clearValidators();

            this.enrollmentForm.controls['carer_lastname'].updateValueAndValidity();
            this.enrollmentForm.controls['carer_email'].updateValueAndValidity();
            this.enrollmentForm.controls['carer_dob'].updateValueAndValidity();
        }

    }

    mandatoryChange(index: number): void {
        const ob = this.bookingArray.value[index];
        this.attendanceSet[index] = (Object.values(ob).indexOf(true) > -1 && ob['mornings'] !== '')
        this.attendanceChecked = (this.attendanceSet.includes(false)) ? false : true;
        this.validForAttendance = (this.attendanceMandatory) ? this.attendanceChecked : true
    }

    fileUploadCheck(status: boolean, inputName: string): void {
        this.checkedUploading[inputName] = (this.getDefaultFiles(inputName)).length > 0 ? true : status;
        this.manualUploadedFiles = Object.values(this.checkedUploading).indexOf(false) > -1 ? false : true;
    }

    newUploads(data: { fileList: FileListItem[], inputName: string }): void {
        this.uploadedFiles[data.inputName] = _.map(data.fileList, 'key');
    }


    checkedUploadsValidate(data: { name: string, value: boolean }): void {
        /*mandatory uploads completeness check*/
        if (Object.keys(this.uploadSwitchInputs).length > 0) {
            Object.values(this.uploadSwitchInputs).forEach(x => {
                if (x.name === data.name && Object.keys(this.uploadedFiles).length > 0 && this.uploadedFiles[x.name] !== undefined && Object.values(this.uploadedFiles[x.name]).length > 0) {
                    this.checkedUploading[x.name] = true;
                } else if ((!x.required || !data.value) && x.name === data.name) {
                    this.checkedUploading[x.name] = null;
                } else if (data.value && x.required && x.name === data.name) {
                    this.checkedUploading[x.name] = false;
                    this.uploadedFiles[data.name] = []
                }
            })
        }
        this.validateUploads = Object.values(this.checkedUploading).indexOf(false) > -1 ? false : true;
    }

    checkedSignatures(data: { name: string, required: boolean, section: string, value: string }): void {
        this.signatureTemp = data;
        this.signaturesList.forEach((x, keyy) => {
            const key = !_.isEmpty(this.signatureTemp[x.section]) && this.signatureTemp[x.section] !== undefined ? this.signatureTemp[x.section].findIndex(y => y.name === x.name) : -2;
            if (key > -1) {
                this.signaturesList[keyy]['value'] = _.isEmpty(this.signatureTemp[x.section][key]) ? '' : this.signatureTemp[x.section][key]['value'];
                this.enrollmentForm.get(this.signatureTemp[x.section][key]['name']).patchValue(this.signaturesList[keyy]['value'], {emitEvent: false});
            }
        })
    }
}

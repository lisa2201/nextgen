import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output, QueryList, ViewChildren,
} from '@angular/core';
import {ControlContainer, FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatExpansionPanel} from '@angular/material/expansion';
import {EnrollmentsService} from '../../services/enrollments.service';
import {Country} from 'app/shared/model/common.interface';
import * as _ from 'lodash';
import {ActivatedRoute} from '@angular/router';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {SignaturePad} from 'angular2-signaturepad';
import {fadeMotion, slideMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {AppConst} from 'app/shared/AppConst';
import {FileListItem} from 'app/shared/components/s3-upload/s3-upload.model';

@Component({
    selector: 'enrolment-section',
    templateUrl: './section.component.html',
    styleUrls: ['./section.component.scss'],
    viewProviders: [MatExpansionPanel],
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ],
})
export class SectionComponent implements OnInit, AfterViewInit {
    panelOpenState = false;
    flip = false;

    @Output() uploadFileChanged: EventEmitter<any>;
    @Output() checkBoxes: EventEmitter<any>;
    @Output() attendanceMarked: EventEmitter<any>;
    @Output() uploadsValidate: EventEmitter<any>;
    @Output() signatureFill: EventEmitter<any>;

    @Input() section: any;
    @Input() uploadTypes: string;
    @Input() allergiesList: any;
    @Input() attendanceMandatory: boolean;
    @Input() formGroup: FormGroup;
    @Input() uploadSwitchInputs: object = [];
    @Input() signaturesList: any = [];

    @ViewChildren(SignaturePad) public signature: QueryList<SignaturePad>;
    @ViewChildren(SignaturePad) public emergencySignature: QueryList<SignaturePad>;

    culturalrequirementschecked: boolean;
    religiousrequirementschecked: boolean;

    time: string[];
    emergency: string[];
    bornOrNotBorn: boolean;
    s3Bucket: string;
    s3Path: string;
    carerChecked: boolean;
    mobile: boolean = false;
    attendanceChecked: boolean = true;
    uploadsChecked: boolean = true;
    attendanceSet: boolean[] = [];
    checkedUploading: boolean[] = [];
    onUploadChecked: boolean[] = [];
    emergencyCheck: boolean[] = [];
    fixedUploadSwitches: string[] = []
    emergencyContacts: any;
    activatedSignatures: any = [];
    canvasWidth: number;
    // checkBoxes: any = [];

    countriesList: Country[] = []; // Country Select
    emergencySignaturesRowWise: any;

    constructor(
        private controlContainer: ControlContainer,
        private _formBuilder: FormBuilder,
        private _enrollmentService: EnrollmentsService,
        private _route: ActivatedRoute,
    ) {

        this.uploadFileChanged = new EventEmitter();
        this.checkBoxes = new EventEmitter();
        this.attendanceMarked = new EventEmitter();
        this.uploadsValidate = new EventEmitter();
        this.signatureFill = new EventEmitter();

        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.ENROLMENT;
        this.culturalrequirementschecked = false;
        this.religiousrequirementschecked = false;
        this.bornOrNotBorn = false;
        this.carerChecked = false;
        this.canvasWidth = 340;
        this.time = [
            'AM',
            'PM',
            'All Day'
        ];

        this.emergency = [
            'Collection',
            'Emergency',
            'Medical',
            'Excursion'
        ];


    }


    ngOnInit(): void {
        this._setInitData();
        this.formGroup.valueChanges.subscribe(
            (addtionalFirstname) => {
                if (!this.carerChecked && addtionalFirstname?.addtionalFirstname?.addtionalFirstname !== '' && addtionalFirstname?.addtionalFirstname?.addtionalFirstname !== undefined) {
                    this.additionalCarerValidationChange(true);
                } else if (this.carerChecked && addtionalFirstname?.addtionalFirstname?.addtionalFirstname === '' && addtionalFirstname?.addtionalFirstname?.addtionalFirstname !== undefined) {
                    this.additionalCarerValidationChange(false);
                }
            }
        )

        if (window.screen.width < 415) {
            this.mobile = true;
        }
        this.attendanceSet[0] = true;

        if (this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyFirtsName')] !== undefined) {
            this.emergencyInputsActiveCheck()
        }
        this._enrollmentService.getEmergencyContactsSettings().subscribe(value => {
            this.emergencyContacts = value;
        })
        this.canvasWidth = document.getElementById('formGlobal').offsetWidth;
    };

    emergencyInputsActiveCheck(): void {
        this.emergencyCheck['emenrgencyFirtsName'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyFirtsName')] !== undefined;
        this.emergencyCheck['emenrgencylastName'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencylastName')] !== undefined;
        this.emergencyCheck['emenrgencyPhone'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyPhone')] !== undefined;
        this.emergencyCheck['emenrgencyhomeAddress'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyhomeAddress')] !== undefined;
        this.emergencyCheck['emenrgencyRelationship'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyRelationship')] !== undefined;
        this.emergencyCheck['emenrgencyContact'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyContact')] !== undefined;
        this.emergencyCheck['emAddiAuthNomiColect'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emAddiAuthNomiColect')] !== undefined;
        this.emergencyCheck['emeAddiAuthNomiColMedi'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emeAddiAuthNomiColMedi')] !== undefined;
        this.emergencyCheck['emAdiAuthNominieeIncursion'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emAdiAuthNominieeIncursion')] !== undefined;
        this.emergencyCheck['emNomKioskApp'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emNomKioskApp')] !== undefined;
        this.emergencyCheck['emNomTranspoSer'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emNomTranspoSer')] !== undefined;
        this.emergencyCheck['emenrgencyEmail'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyEmail')] !== undefined;
    }

    /**
     * Set select data
     */
    _setInitData(): void {

        const resolveData = this._route.snapshot.data['countryList'];

        if (!_.isEmpty(resolveData)) {
            this.countriesList = resolveData[0];
        }
    }


    renderSignatureData(): void {
        let counter = 0;
        this.section.inputs.forEach((x) => {
            const key = this.signaturesList.findIndex(y => y.name === x || y.name === x['input_name']);
            if (this.section['section_code'] === 'emergency_contact_details' && (x.input_name === 'emenrgencyFirtsName' || x === 'emenrgencyFirtsName')) {
                if (!_.isEmpty(this.emergencyContacts)) {

                    const emergencyFields = this.signaturesList.filter(item => item.section === 'emergency_contact_details');

                    const row = [];
                    row.push([])
                    row[0].push(_.map(emergencyFields, 'name'));
                    this.emergencySignaturesRowWise = [_.map(emergencyFields, 'name')];
                }

            } else {
                if (key > -1) {
                    this.signature['_results'][counter].fromDataURL(this.signaturesList[key]['value']);
                    counter++;
                }
            }
        })

    }

    ngAfterViewInit(): void {
        this.renderSignatureData();
    }

    clearSignature(name): void {
        this.activatedSignatures[this.section['section_code']] = _.filter(this.signaturesList, {'section': this.section['section_code']});
        const key = this.activatedSignatures[this.section['section_code']].findIndex(x => x.name === name);
        this.signature['_results'][key].clear()
        this.activatedSignatures[this.section['section_code']][key]['value'] = '';
        this.signatureFill.emit(this.activatedSignatures)
    }

    drawComplete(name): void {
        this.activatedSignatures[this.section['section_code']] = _.filter(this.signaturesList, {'section': this.section['section_code']});
        const key = this.activatedSignatures[this.section['section_code']].findIndex(x => x.name === name);
        this.activatedSignatures[this.section['section_code']][key]['value'] = this.signature['_results'][key].toDataURL();
        this.signatureFill.emit(this.activatedSignatures)
    }


    // clearEmergencySignature(index, name): void {
    //     this.emergencySignature['_results'][index + 1].clear()
    //     this.emergencyContactsArray.controls[index].get(name).patchValue(this.emergencySignature['_results'][index + 1].toDataURL(), {emitEvent: false});
    // }
    //
    // drawEmergencyComplete(index, name): void {
    //     this.emergencyContactsArray.controls[index].get(name).patchValue(this.emergencySignature['_results'][index + 1].toDataURL(), {emitEvent: false});
    // }

    clearEmergencySignature(row, name): void {
        let counter = 2;
        this.emergencySignaturesRowWise.forEach((rowArray, rowKey) => {
            rowArray.forEach((input) => {
                if (rowKey === row && input === name) {
                    this.emergencySignature['_results'][counter].clear()
                    this.emergencyContactsArray.controls[rowKey].get(name).patchValue('', {emitEvent: false});
                }
                counter++;
            })
        })
    }

    drawEmergencyComplete(row, name): void {
        let counter = 2;
        this.emergencySignaturesRowWise.forEach((rowArray, rowKey) => {
            rowArray.forEach((input) => {
                if (rowKey === row && input === name) {
                    this.emergencyContactsArray.controls[rowKey].get(name).patchValue(this.emergencySignature['_results'][counter].toDataURL(), {emitEvent: false});
                }
                counter++;
            })
        })

    }

    onSpecialized(section) {
        section.specialized = !section.specialized;
    }

    get bookingArray() {
        return this.formGroup.get('preferedDate') as FormArray;
    }

    addBooking() {
        this.attendanceMarked.emit({value: false})
        this.bookingArray.push(this.addBookingGroup());
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

    /*----------Allergies---------------*/

    addAllergyGroup(): FormGroup {
        return this._formBuilder.group({
            allergies: [null],
            detailsOfAllergies: [''],
        });
    }

    get allergyArray() {
        return this.formGroup.get('addAllergy') as FormArray;
    }

    addAllergy() {
        this.allergyArray.push(this.addAllergyGroup());
    }

    removeAllergy(index) {
        this.allergyArray.removeAt(index);
    }

    /*-----Emergency-Contacts----------------*/

    // addEmergencyGroup(): FormGroup {
    //     return this._formBuilder.group({
    //         ec_lastname: ['', [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z ]+$')]],
    //         ec_firstname: ['', [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z ]+$')]],
    //         ec_address: ['', [Validators.maxLength(150)]],
    //         ec_phone: ['', [Validators.required, Validators.max(9999999999), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]],
    //         ec_email: ['', [Validators.maxLength(150), Validators.email]],
    //         // emergencyType: [null, Validators.required],
    //         ec_relationship: ['', [Validators.required, Validators.maxLength(150)]],
    //         emNomKioskApp: [false],
    //         ec_consent_incursion: [false],
    //         ec_consent_make_medical_decision: [false],
    //         ec_consent_emergency_contact: [false],
    //         ec_consent_collect_child: [false],
    //         emNomTranspoSer: [false],
    //     })
    // }

    get emergencyContactsArray() {
        return this.formGroup.get('addEmergencyContact') as FormArray;
    }

    addEmergencyContact() {
        this.emergencyContactsArray.push(this.addEmergencyGroup());
        this.emergencySignaturesRowWise.push(this.emergencySignaturesRowWise[0]);
    }

    removeEmergencyContact(index) {
        this.emergencyContactsArray.removeAt(index);
    }

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

    changeMultiChecks(input: string, event: boolean, option: string, sectionCode: string): void {
        this.checkBoxes.next({event: event, name: input, value: option, sectionCode: sectionCode});
    }

    additionalCarerValidationChange(permission): void {
        if (permission) {
            // console.log('validations');
            this.carerChecked = true;
            this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'addtionallastname')].input_mandatory = true;
            this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'carerEmail')].input_mandatory = true;
            this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'addtionaldateOfBirth')].input_mandatory = true;

            this.formGroup.controls['addtionallastname']['controls']['addtionallastname'].setValidators([Validators.required, Validators.pattern('^[a-zA-Z ]+$'), Validators.maxLength(150)]);
            this.formGroup.controls['carerEmail']['controls']['carerEmail'].setValidators([Validators.required, Validators.email, Validators.maxLength(150)]);
            this.formGroup.controls['addtionaldateOfBirth']['controls']['addtionaldateOfBirth'].setValidators(Validators.required);

            this.formGroup.controls['addtionallastname']['controls']['addtionallastname'].updateValueAndValidity();
            this.formGroup.controls['carerEmail']['controls']['carerEmail'].updateValueAndValidity();
            this.formGroup.controls['addtionaldateOfBirth']['controls']['addtionaldateOfBirth'].updateValueAndValidity();
        } else {
            // console.log('edit disabale');

            this.carerChecked = false;
            this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'addtionallastname')].input_mandatory = false;
            this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'carerEmail')].input_mandatory = false;
            this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'addtionaldateOfBirth')].input_mandatory = false;
            // this.formGroup.controls['addtionallastname']['controls']['addtionallastname'].clearValidators();
            this.formGroup.controls['addtionallastname']['controls']['addtionallastname'].setValidators([Validators.pattern('^[a-zA-Z ]+$'), Validators.maxLength(150)]);
            this.formGroup.controls['carerEmail']['controls']['carerEmail'].setValidators([Validators.email, Validators.maxLength(150)]);
            this.formGroup.controls['addtionaldateOfBirth']['controls']['addtionaldateOfBirth'].clearValidators();


            this.formGroup.controls['addtionallastname']['controls']['addtionallastname'].updateValueAndValidity();
            this.formGroup.controls['carerEmail']['controls']['carerEmail'].updateValueAndValidity();
            this.formGroup.controls['addtionaldateOfBirth']['controls']['addtionaldateOfBirth'].updateValueAndValidity();
        }

    }

    mandatoryChange(index: number): void {
        const ob = this.bookingArray.value[index];
        this.attendanceSet[index] = (Object.values(ob).indexOf(true) > -1 && ob['mornings'] !== '')
        this.attendanceChecked = (this.attendanceSet.includes(false)) ? false : true;
        this.attendanceMarked.emit({value: this.attendanceChecked})
    }

    customChange(value: boolean, name: string): void {
        if (name === 'culturalRequirements') {
            this.culturalrequirementschecked = !!value;
        } else if (name === 'religiousRequirements') {
            this.religiousrequirementschecked = !!value;
        }
    }

    onUpload(mode: boolean, name: string): void {
        this.checkedUploading[name] = mode && this.uploadSwitchInputs[name].required;
        this.onUploadChecked[name] = !!mode
        this.uploadsValidate.emit({
            name: name,
            value: (mode) ? this.uploadSwitchInputs[name].required : false
        })
    }

    handleUploadChange(fileList: FileListItem[], inputName: string): void {
        this.checkedUploading[inputName] = fileList == null ? this.uploadSwitchInputs[inputName].required : false;
        this.uploadFileChanged.next({fileList: fileList, inputName: inputName});
        this.uploadsValidate.emit({
            name: inputName,
            value: (fileList == null && this.uploadSwitchInputs[inputName].required)
        })
    }

    isInArray(name): boolean {
        return Object.values(this.uploadSwitchInputs).indexOf(name) > -1 ? false : true;
    }

    addEmergencyGroup(): FormGroup {
        const fields = {};

        this.emergencyContacts.forEach((g, key) => {
            if (g.name === 'emenrgencyPhone') {
                Object.assign(fields, {[g.name]: g.data['input_mandatory'] ? ['', [Validators.required, Validators.max(9999999999), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]] : ['', [Validators.max(9999999999), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]]});
            } else if (g.data['input_type'] === 'textbox') {
                Object.assign(fields, {[g.name]: g.data['input_mandatory'] ? ['', [Validators.required, Validators.maxLength(250)]] : ['', [Validators.maxLength(250)]]});
            } else if (g.data['input_type'] === 'date-picker') {
                Object.assign(fields, {[g.name]: g.data['input_mandatory'] ? ['', [Validators.required]] : ['', null]});
            } else if (g.data['input_type'] === 'email') {
                Object.assign(fields, {[g.name]: g.data['input_mandatory'] ? ['', [Validators.email, Validators.required, Validators.maxLength(150)]] : ['', [Validators.maxLength(150), Validators.email]]});
            } else if (g.data['input_type'] === 'checkbox') {
                Object.assign(fields, {[g.name]: [false, []]});
            } else if (g.data['input_type'] === 'select-multiple') {
                Object.assign(fields, {[g.name]: g.data['input_mandatory'] ? [[], [Validators.required]] : [[], []]});
            } else if (g.data['input_type'] === 'text-area') {
                Object.assign(fields, {[g.name]: g.data['input_mandatory'] ? ['', [Validators.required]] : ['', []]});
            } else {
                Object.assign(fields, {[g.name]: g.data['input_mandatory'] ? ['', [Validators.required]] : ['', []]});
            }
        })
        return this._formBuilder.group(fields);
    }

    removeBooking(index): void {
        this.bookingArray.removeAt(index);
    }

    gotoPage(url): void {
        window.open((url.includes('http://') || url.includes('https://')) ? url : 'http://' + url, '_blank');
    }

}

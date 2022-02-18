import {
    AfterViewInit,
    Component,
    EventEmitter,
    Inject,
    Input,
    OnInit,
    Output,
    QueryList,
    ViewChildren
} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AppConst} from 'app/shared/AppConst';
import {FileListItem} from 'app/shared/components/s3-upload/s3-upload.model';
import {WaitListEnrollmentService} from '../../../service/waitlist-enrollment.service';
import {Country} from 'app/shared/model/common.interface';
import * as _ from 'lodash';
import {SignaturePad} from 'angular2-signaturepad';

@Component({
    selector: 'new-input',
    templateUrl: './new-input.component.html',
    styleUrls: ['./new-input.component.scss']
})
export class NewInputComponent implements OnInit, AfterViewInit {

    @Input() newInputs: any // deletable
    @Input() section: any
    @Input() formGroup: FormGroup;
    @Input() form: string;
    @Input() uploadedFiles: string;
    @Input() signaturesList: any = [];
    @Input() uploadSwitchInputs: any;

    @Output() checkBoxes: EventEmitter<any>;
    @Output() uploadsValidate: EventEmitter<any>;
    @Output() newUploads: EventEmitter<any>;
    @Output() signatureFill: EventEmitter<any>;

    @ViewChildren(SignaturePad) public signature: QueryList<SignaturePad>;
    @ViewChildren(SignaturePad) public emergencySignature: QueryList<SignaturePad>;

    onUploadChecked: any[] = [];
    checkedUploading: any[] = [];
    uploadsChecked: boolean = true;
    s3Bucket: string;
    uploadTypes: string;
    s3Path: string;
    validForAttendance: boolean = false;
    attendanceChecked: boolean = false;
    allChecked: any;
    childBornChecked: boolean;
    time: string[];
    attendanceSet: boolean[] = [];
    attendanceMandatory: boolean = false;
    emergencyContacts: any
    emergencyContactsAnswers: any
    allergiesList: string[];
    mobile: boolean = false;
    countriesList: Country[] = []; // Country Select  showHearAbout: boolean;
    culturalrequirementschecked: boolean;
    religiousrequirementschecked: boolean;
    activatedSignatures: any = [];
    canvasWidth: number;
    emergencySignaturesRowWise: any;

    constructor(
        private _formBuilder: FormBuilder,
        private _enrollmentService: WaitListEnrollmentService,
        @Inject(MAT_DIALOG_DATA) private _data: any,
    ) {
        this.checkBoxes = new EventEmitter();
        this.uploadsValidate = new EventEmitter();
        this.newUploads = new EventEmitter();
        this.signatureFill = new EventEmitter();
        if (window.screen.width < 415) {
            this.mobile = true;
        }
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.uploadTypes = 'image/*, application/pdf';
        this.s3Path = AppConst.s3Paths.ENROLMENT;
        this.time = [
            'AM',
            'PM',
            'All Day'
        ];
        this.attendanceSet[0] = true;
        this.allergiesList = _data.response.allergyTypes;
        this.countriesList = _data.response.countriesList;
        this.canvasWidth = 340;
    }

    ngOnInit(): void {
        this.uploadsInputsValidate()
        if (this.form !== 'enquiry' && this.newInputs.findIndex(x => x.name === 'child_bornOrNot') !== -1 && this.newInputs[this.newInputs.findIndex(x => x.name === 'child_bornOrNot')]['values']) {
            this.onChildBornCheck(true);
        } else if (this.form !== 'enquiry') {
            this.onChildBornCheck(false);
        }
        if (this.section['code'] === 'emergency_contact_details') {
            this.newInputs = [this.newInputs[this.newInputs.findIndex(x => x.name === 'addEmergencyContact')]]
        }
        this._enrollmentService.getEmergencyContactsSettings().subscribe(value => {
            this.emergencyContacts = value;
        })

        if (typeof this.emergencyContacts !== 'undefined' && this.emergencyContacts.length > 0) {
            this.emergencyContactsAnswers = !_.isEmpty(this.emergencyContacts[this.emergencyContacts.findIndex(y => y.name === 'addEmergencyContact')]?.data) ? this.emergencyContacts[this.emergencyContacts.findIndex(y => y.name === 'addEmergencyContact')]['data']['values'] : [];
        }
        this.canvasWidth = document.getElementById('idGlobal').offsetWidth;
    }

    renderSignatureData(): void {

        let counter = 0;
        let emergencyCounter = 0;
        this.section.inputs.forEach((x) => {
            const key = this.signaturesList.findIndex(y => y.name === x || y.name === x.name);
            if (this.section['code'] === 'emergency_contact_details' && (x.name === 'emenrgencyFirtsName' || x === 'emenrgencyFirtsName')) {
                if (!_.isEmpty(this.formGroup.controls?.addEmergencyContact?.value)) {
                    const emergencyFields = this.signaturesList.filter(item => item.section === 'emergency_contact_details');
                    const row = [];
                    this.formGroup.controls.addEmergencyContact.value.forEach((z, keyy) => {
                        row.push([])
                        emergencyFields.forEach((emField) => {

                            row[keyy].push(emField['name']);
                            this.emergencySignature['_results'][emergencyCounter].fromDataURL(z[emField['name']]);
                            this.emergencyContactsArray.controls[keyy].get(emField['name']).patchValue(z[emField['name']], {emitEvent: false});
                            emergencyCounter++;
                        })
                    })
                    this.emergencySignaturesRowWise = row;
                }

            } else if (this.section['code'] !== 'emergency_contact_details') {
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

    uploadsInputsValidate(): void {
        this.newInputs.forEach(x => {
            if (x.input_type === 'upload-switch' && ((x.waitlist_section !== '' && this.form === 'waitlist') || (x.section !== '' && this.form === 'enrolment'))) {
                this.onUploadChecked[x.name] = !!x.values;
            }
        })

    }

    changeMultiChecks(input: string, event: boolean, option: string, sectionCode: string): void {
        this.checkBoxes.next({event: event, name: input, value: option, sectionCode: sectionCode});
    }

    checkEmpty(value): boolean {
        return !!_.isEmpty(value);
    }

    checkChecked(value, option): boolean {
        return (value.indexOf(option) > -1);
    }

    handleUploadChange(fileList: FileListItem[], inputName: string): void {
        this.checkedUploading[inputName] = fileList == null ? this.uploadSwitchInputs[inputName].required : false;
        this.newUploads.emit({fileList: fileList, inputName: inputName});
        this.uploadsValidate.emit({
            name: inputName,
            value: (fileList == null && this.uploadSwitchInputs[inputName].required)
        })
    }

    getDefaultFiles(name: string): any {
        const files = (this.uploadedFiles[name]) ? this.uploadedFiles[name] : [];
        return files ? files : [];
    }

    onUpload(mode: boolean, name: string): void {
        if (!mode) {
            this.uploadedFiles[name] = []
        }
        this.checkedUploading[name] = mode && -this.uploadSwitchInputs[name].required;
        this.onUploadChecked[name] = !!mode
        this.uploadsValidate.emit({
            name: name,
            value: (mode) ? this.uploadSwitchInputs[name].required : false
        })


    }

    mandatoryChange(index): void {
        const ob = this.attendanceArray.value[index];
        this.attendanceChecked = (Object.values(ob).indexOf(true) > -1);
        this.validForAttendance = this.attendanceChecked
    }

    get attendanceArray() {
        return this.formGroup.get('attendance') as FormArray;
    }

    onChildBornCheck(mode: boolean): void {
        if (mode === true && this.form === 'waitlist') {
            this.childBornChecked = true;
            this.formGroup.get('dateOfBirth').setValidators([Validators.required]);
            this.formGroup.get('childGender').setValidators([Validators.required]);

        } else if (this.form === 'waitlist') {
            this.childBornChecked = false;
            this.formGroup.get('dateOfBirth').clearValidators();
            this.formGroup.get('childGender').clearValidators();
        }

        this.formGroup.get('dateOfBirth').updateValueAndValidity();
        this.formGroup.get('childGender').updateValueAndValidity();
    }

    mandatoryChangeEnrolment(index: number): void {
        const ob = this.bookingArray.value[index];
        this.attendanceSet[index] = (Object.values(ob).indexOf(true) > -1 && ob['mornings'] !== '')
        this.attendanceChecked = (this.attendanceSet.includes(false)) ? false : true;
        this.validForAttendance = (this.attendanceMandatory) ? this.attendanceChecked : true
    }

    get bookingArray() {
        return this.formGroup.get('preferedDate') as FormArray;
    }

    removeBooking(index): void {
        this.bookingArray.removeAt(index);
    }

    addBooking() {
        this.bookingArray.push(this.addBookingGroup());
        this.validForAttendance = false;
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

    addEmergencyContact() {
        this.emergencyContactsArray.push(this.addEmergencyGroup());
        this.emergencySignaturesRowWise.push(this.emergencySignaturesRowWise[0]);
    }

    get emergencyContactsArray() {
        return this.formGroup.get('addEmergencyContact') as FormArray;
    }

    addEmergencyGroup(): FormGroup {

        const fields = {};

        this.emergencyContacts.forEach((g, key) => {
            if (g.name === 'emenrgencyPhone') {
                Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.required, Validators.max(9999999999), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]] : ['', [Validators.max(9999999999), Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]]});
            } else if (g.data['input_type'] === 'textbox') {
                Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.pattern('^[a-zA-Z 0-9_)(-\-\']+'), Validators.required, Validators.maxLength(150)]] : ['', [Validators.maxLength(150), Validators.pattern('^[a-zA-Z 0-9_)(-\-\']+')]]});
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
            } else {
                Object.assign(fields, {[g.name]: g.data['required'] ? ['', [Validators.required]] : ['', []]});
            }
        })
        return this._formBuilder.group(fields);
    }

    removeEmergencyContact(index) {
        this.emergencyContactsArray.removeAt(index);
    }

    get allergyArray() {
        return this.formGroup.get('addAllergy') as FormArray;
    }

    removeAllergy(index) {
        this.allergyArray.removeAt(index);
    }

    addAllergy() {
        this.allergyArray.push(this.addAllergyGroup());
    }

    addAllergyGroup(): FormGroup {
        return this._formBuilder.group({
            allergies: [''],
            detailsOfAllergies: [''],
        });
    }

    gotoPage(url): void {
        window.open((url.includes('http://') || url.includes('https://')) ? url : 'http://' + url, '_blank');
    }

    customChange(value: boolean, name: string): void {
        if (name === 'culturalRequirements') {
            this.culturalrequirementschecked = !!value;
        } else if (name === 'religiousRequirements') {
            this.religiousrequirementschecked = !!value;
        }
    }

    clearSignature(name): void {
        this.activatedSignatures[this.section['code']] = _.filter(this.signaturesList, {'section': this.section['code']});
        const key = this.activatedSignatures[this.section['code']].findIndex(x => x.name === name);
        this.signature['_results'][key].clear()
        this.activatedSignatures[this.section['code']][key]['value'] = '';
        this.signatureFill.emit(this.activatedSignatures)
    }

    drawComplete(name): void {
        this.activatedSignatures[this.section['code']] = _.filter(this.signaturesList, {'section': this.section['code']});
        const key = this.activatedSignatures[this.section['code']].findIndex(x => x.name === name);
        this.activatedSignatures[this.section['code']][key]['value'] = this.signature['_results'][key].toDataURL();
        this.signatureFill.emit(this.activatedSignatures)
    }

    clearEmergencySignature(row, name): void {
        let counter = 0;
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
        let counter = 0;
        this.emergencySignaturesRowWise.forEach((rowArray, rowKey) => {
            rowArray.forEach((input) => {
                if (rowKey === row && input === name) {
                    this.emergencyContactsArray.controls[rowKey].get(name).patchValue(this.emergencySignature['_results'][counter].toDataURL(), {emitEvent: false});
                }
                counter++;
            })
        })

    }
}

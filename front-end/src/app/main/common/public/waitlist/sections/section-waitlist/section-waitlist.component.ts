import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output, QueryList, ViewChildren,
} from '@angular/core';
import {Sections} from '../../models/Sections';
import {ControlContainer, FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {MatExpansionPanel} from '@angular/material/expansion';
import {EnrollmentsService} from '../../services/enrollments.service';
import {Country} from 'app/shared/model/common.interface';
import * as _ from 'lodash';
import {ActivatedRoute} from '@angular/router';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {fadeMotion, slideMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {AppConst} from 'app/shared/AppConst';
import {FileListItem} from 'app/shared/components/s3-upload/s3-upload.model';
import {CommonService} from 'app/shared/service/common.service';
import {SignaturePad} from 'angular2-signaturepad';

@Component({
    selector: 'waitlist-section',
    templateUrl: './section-waitlist.component.html',
    styleUrls: ['./section-waitlist.component.scss'],
    viewProviders: [MatExpansionPanel],
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class SectionWaitlistComponent implements OnInit, AfterViewInit {
    panelOpenState = false;
    flip = false;

    @Output() uploadFileChanged: EventEmitter<any>;
    @Output() checkBoxes: EventEmitter<any>;
    @Output() attendanceMarked: EventEmitter<any>;
    @Output() signatureFill: EventEmitter<any>;

    @Input() section: Sections;
    @Input() uploadTypes: string;
    @Input() allergiesList: any;
    @Input() attendanceMandatory: boolean;
    @Input() formGroup: FormGroup;
    @Output() uploadsValidate: EventEmitter<any>;
    @Input() uploadSwitchInputs: any;
    @Input() signaturesList: any = [];

    @ViewChildren(SignaturePad) public signature: QueryList<SignaturePad>;

    uploadCourtOrdersChecked: boolean;
    culturalrequirementschecked: boolean;
    religiousrequirementschecked: boolean;
    uploadHealthRecrdChecked: boolean;
    onUploadImmunisedRecordChecked: boolean;
    onUploadPrescribedMedicineChecked: boolean;
    onUploadAnaphylaxisChecked: boolean;
    onUploadOtherHealthChecked: boolean;
    onUploadAsthmaChecked: boolean;
    onUploadBcChecked: boolean;
    time: string[];
    emergency: string[];
    bornOrNotBorn: boolean;
    s3Bucket: string;
    s3Path: string;
    indeterminate: boolean;
    attendanceFormStatus: string;
    // checkBoxes: any = [];
    allChecked: boolean;
    mobile: boolean = false;
    countriesList: Country[] = []; // Country Select
    attendanceChecked: boolean = false;
    onUploadChecked: boolean[] = [];
    checkedUploading: boolean[] = [];
    uploadsChecked: boolean = true;
    activatedSignatures: any = [];
    canvasWidth: number;

    constructor(
        private controlContainer: ControlContainer,
        private _formBuilder: FormBuilder,
        private _enrollmentService: EnrollmentsService,
        private _route: ActivatedRoute,
        private _commonService: CommonService,
    ) {

        this.uploadFileChanged = new EventEmitter();
        this.checkBoxes = new EventEmitter();
        this.attendanceMarked = new EventEmitter();
        this.uploadsValidate = new EventEmitter();
        this.signatureFill = new EventEmitter();

        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.ENROLMENT;
        this.uploadCourtOrdersChecked = false;
        this.culturalrequirementschecked = false;
        this.religiousrequirementschecked = false;
        this.uploadHealthRecrdChecked = false;
        this.onUploadImmunisedRecordChecked = false;
        this.onUploadPrescribedMedicineChecked = false;
        this.onUploadAnaphylaxisChecked = false;
        this.onUploadOtherHealthChecked = false;
        this.onUploadAsthmaChecked = false;
        this.onUploadBcChecked = false;
        this.bornOrNotBorn = false;
        this.attendanceFormStatus = '';
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
        if (window.screen.width < 415) {
            this.mobile = true;
        }
        this.canvasWidth = document.getElementById('formGlobal').offsetWidth;
    };

    /**
     * Set select data
     */
    _setInitData(): void {

        const resolveData = this._route.snapshot.data['countryList'];

        if (!_.isEmpty(resolveData)) {

            this.countriesList = resolveData[0];
        }

    }

    onSpecialized(section) {
        section.specialized = !section.specialized;
    }

    renderSignatureData(): void {
        let counter = 0;
        this.section.inputs.forEach((x) => {
            const key = this.signaturesList.findIndex(y => y.name === x || y.name === x['input_name']);
            if (key > -1) {
                this.signature['_results'][counter].fromDataURL(this.signaturesList[key]['value']);
                counter++;
            }
        })
    }

    ngAfterViewInit(): void {
        this.renderSignatureData();
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

    handleUploadChange(fileList: FileListItem[], inputName: string): void {
        this.checkedUploading[inputName] = fileList == null ? this.uploadSwitchInputs[inputName].required : false;
        this.uploadFileChanged.next({fileList: fileList, inputName: inputName});
        this.uploadsValidate.emit({
            name: inputName,
            value: (fileList == null && this.uploadSwitchInputs[inputName].required)
        })
    }

    changeMultiChecks(input: string, event: boolean, option: string, sectionCode: string): void {
        this.checkBoxes.next({event: event, name: input, value: option, sectionCode: sectionCode});
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.formGroup.controls;
    }

    trackByFn(index: number, item: any): number {
        return index;
    }

    get attendanceArray() {
        return this.formGroup.get('attendance') as FormArray;
    }

    onChildBornCheck(mode: boolean): void {
        setTimeout(() => {
            if (mode == true) {
                this.formGroup.get('dateOfBirth').enable()
                this.formGroup.get('childGender').enable()
            } else {
                this.formGroup.get('dateOfBirth').disable()
                this.formGroup.get('childGender').disable()
            }
        }, 200);
    }

    /**
     * update all attendance items
     */
    updateAllChecked(): void {
        console.log('this.fc.attendance.value');
        console.log(this.fc.attendance.value[0]);
        this.indeterminate = false;

        this.fc.attendance.patchValue(this.fc.attendance.value.map(() => this.allChecked), {emitEvent: false});

        this.fc.attendance.markAllAsTouched();

        this.hasAttendanceFormError();
    }

    /**
     * check if attendance has error
     */
    hasAttendanceFormError(): void {
        this.attendanceFormStatus = (this.formGroup.get('attendance').hasError('required') && this.formGroup.get('attendance').touched) ? 'error' : '';
    }


    /**
     * update single attendance item
     */
    updateSingleChecked(): void {
        if (this.fc.attendance.value.every(item => item === false)) {
            this.allChecked = false;
            this.indeterminate = false;
        } else if (this.fc.attendance.value.every(item => item === true)) {
            this.allChecked = true;
            this.indeterminate = false;
        } else {
            this.indeterminate = true;
        }

        this.hasAttendanceFormError();
    }

    mandatoryChange(index): void {
        const ob = this.attendanceArray.value[index];
        this.attendanceChecked = (Object.values(ob).indexOf(true) > -1);
        this.attendanceMarked.emit({value: this.attendanceChecked})
    }

    onUpload(mode: boolean, name: string): void {
        this.checkedUploading[name] = mode && this.uploadSwitchInputs[name].required;
        this.onUploadChecked[name] = !!mode
        this.uploadsValidate.emit({
            name: name,
            value: (mode) ? this.uploadSwitchInputs[name].required : false
        })

    }

    isInArray(name): boolean {
        return Object.values(this.uploadSwitchInputs).indexOf(name) > -1 ? false : true;
    }

    gotoPage(url): void {
        window.open((url.includes('http://') || url.includes('https://')) ? url : 'http://' + url, '_blank');
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
}

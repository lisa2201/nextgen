import {
    Component,
    Input,
    OnInit, QueryList, ViewChildren,
} from '@angular/core';
import {Sections} from '../../../models/sections.model';
import {ControlContainer, FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatExpansionPanel} from '@angular/material/expansion';
import {EnrollmentsService} from '../../../services/enrollments.service';
import {Country} from 'app/shared/model/common.interface';
import * as _ from 'lodash';
import {ActivatedRoute} from '@angular/router';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {fadeMotion, slideMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';
import {SignaturePad} from 'angular2-signaturepad';

@Component({
    selector: 'app-section',
    templateUrl: './section.component.html',
    styleUrls: ['./section.component.scss'],
    viewProviders: [MatExpansionPanel],
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class SectionComponent implements OnInit {
    panelOpenState = false;
    flip = false;

    @Input() section: Sections;
    @Input() formGroup: FormGroup;
    @Input() signaturesList: any = [];

    @ViewChildren(SignaturePad) public signature: QueryList<SignaturePad>;

    // @ViewChild(SignaturePad) public signaturePad: SignaturePad;
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
    allergiesList: string[];
    emergency: string[];
    emergencyCheck: boolean[] = [];
    countriesList: Country[] = []; // Country Select
    activatedSignatures: any = [];
    canvasWidth: number;

    constructor(
        private controlContainer: ControlContainer,
        private _formBuilder: FormBuilder,
        private _enrollmentService: EnrollmentsService,
        private _route: ActivatedRoute,
        private _notification: NotificationService,
    ) {

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
        this.canvasWidth = 340;
    }


    ngOnInit(): void {
        this._setInitData();
        this.canvasWidth = document.getElementById('idGlobal').offsetWidth;
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

    // emergencyInputsActiveCheck(): void {
    //     this.emergencyCheck['emenrgencyFirtsName'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyFirtsName')] !== undefined;
    //     this.emergencyCheck['emenrgencylastName'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencylastName')] !== undefined;
    //     this.emergencyCheck['emenrgencyPhone'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyPhone')] !== undefined;
    //     this.emergencyCheck['emenrgencyhomeAddress'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyhomeAddress')] !== undefined;
    //     this.emergencyCheck['emenrgencyRelationship'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyRelationship')] !== undefined;
    //     this.emergencyCheck['emenrgencyContact'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyContact')] !== undefined;
    //     this.emergencyCheck['emAddiAuthNomiColect'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emAddiAuthNomiColect')] !== undefined;
    //     this.emergencyCheck['emeAddiAuthNomiColMedi'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emeAddiAuthNomiColMedi')] !== undefined;
    //     this.emergencyCheck['emAdiAuthNominieeIncursion'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emAdiAuthNominieeIncursion')] !== undefined;
    //     this.emergencyCheck['emNomKioskApp'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emNomKioskApp')] !== undefined;
    //     this.emergencyCheck['emNomTranspoSer'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emNomTranspoSer')] !== undefined;
    //     this.emergencyCheck['emenrgencyEmail'] = this.section.inputs[this.section.inputs.findIndex(x => x.input_name === 'emenrgencyEmail')] !== undefined;
    // }

    ngAfterViewInit() {
        // this.signaturePad.clear();
        // this.signaturePad.set('minWidth', 5);
        // this.signaturePad.clear();
    }

    onUploadCourtOrders(mode: boolean): void {
        if (mode == true) {
            this.uploadCourtOrdersChecked = true;
        } else {
            this.uploadCourtOrdersChecked = false;
        }
    }

    onCulturalRequirement(mode: boolean): void {
        if (mode == true) {
            this.culturalrequirementschecked = true;
        } else {
            this.culturalrequirementschecked = false;
        }
    }

    onReligiousRequirementsChange(mode: boolean): void {
        if (mode == true) {
            this.religiousrequirementschecked = true;
        } else {
            this.religiousrequirementschecked = false;
        }
    }

    onUploadHealthRecord(mode: boolean): void {
        if (mode == true) {
            this.uploadHealthRecrdChecked = true;
        } else {
            this.uploadHealthRecrdChecked = false;
        }
    }

    onUploadImmunisedRecord(mode: boolean): void {
        if (mode == true) {
            this.onUploadImmunisedRecordChecked = true;
        } else {
            this.onUploadImmunisedRecordChecked = false;
        }
    }

    onUploadPrescribedMedicine(mode: boolean): void {
        if (mode == true) {
            this.onUploadPrescribedMedicineChecked = true;
        } else {
            this.onUploadPrescribedMedicineChecked = false;
        }
    }

    onUploadAnaphylaxis(mode: boolean): void {
        if (mode == true) {
            this.onUploadAnaphylaxisChecked = true;
        } else {
            this.onUploadAnaphylaxisChecked = false;
        }
    }

    onUploadOtherHealth(mode: boolean): void {
        if (mode == true) {
            this.onUploadOtherHealthChecked = true;
        } else {
            this.onUploadOtherHealthChecked = false;
        }
    }

    onUploadAsthma(mode: boolean): void {
        if (mode == true) {
            this.onUploadAsthmaChecked = true;
        } else {
            this.onUploadAsthmaChecked = false;
        }
    }

    onUploadBc(mode: boolean): void {
        if (mode == true) {
            this.onUploadBcChecked = true;
        } else {
            this.onUploadBcChecked = false;
        }
    }


    setClasses() {
    }

    onSpecialized(section) {
        section.specialized = !section.specialized;
    }

    get bookingArray() {
        return this.formGroup.get('preferedDate') as FormArray;
    }

    addBooking() {
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
            saturday: [false],
            sunday: [false]

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

    addEmergencyGroup(): FormGroup {
        return this._formBuilder.group({
            ec_firstname: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
            ec_lastname: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
            ec_address: [''],
            ec_phone: ['', [Validators.required, Validators.pattern(/^[0-9]\d*$/)]],
            ec_email: ['', [Validators.required, Validators.email]],
            // emergencyType: [null, Validators.required],
            ec_relationship: [''],
            ec_consent_incursion: [false],
            ec_consent_make_medical_decision: [false],
            ec_consent_emergency_contact: [false],
            ec_consent_collect_child: [false],
        })
    }

    get emergencyContactsArray() {
        return this.formGroup.get('addEmergencyContact') as FormArray;
    }

    addEmergencyContact() {
        setTimeout(() => this._notification.displaySnackBar('This is for preview only.', NotifyType.INFO), 200);
        // this.emergencyContactsArray.push(this.addEmergencyGroup());
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

    gotoPage(url): void {
        window.open((url.includes('http://') || url.includes('https://')) ? url : 'http://' + url, '_blank');
    }

    clearSignature(name): void {
        this.activatedSignatures[this.section['section_code']] = _.filter(this.signaturesList, {'section': this.section['section_code']});
        const key = this.activatedSignatures[this.section['section_code']].findIndex(x => x.name === name);
        this.signature['_results'][key].clear()
    }

}

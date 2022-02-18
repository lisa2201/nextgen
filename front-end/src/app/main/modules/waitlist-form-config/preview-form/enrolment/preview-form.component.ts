import {
    Component,
    OnInit,
    ViewEncapsulation,
    OnDestroy,
    ViewChild,
    AfterViewInit,
    Inject,
    EventEmitter, Input
} from '@angular/core';
import {FormGroup, Validators, FormBuilder, FormControl, FormArray} from '@angular/forms';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {fuseAnimations} from '@fuse/animations';
import {ReCaptcha2Component} from 'ngx-captcha';
import {helpMotion, UploadFilter, UploadFile} from 'ng-zorro-antd';
import * as _ from 'lodash';
import {NGXLogger} from 'ngx-logger';
import {AppConst} from 'app/shared/AppConst';
import {NotificationService} from 'app/shared/service/notification.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {Router, ActivatedRoute} from '@angular/router';
import {Country} from 'app/shared/model/common.interface';
import {CommonService} from 'app/shared/service/common.service';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {MatDialog} from '@angular/material/dialog';
import {DeclarationDialogComponent} from '../../declaration-dialog/declaration-dialog.component';
import {Waitlist} from '../../models/waitlist.model';
import {EnrollmentsService} from '../../services/enrollments.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {AuthService} from 'app/shared/service/auth.service';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SectionService} from '../../services/section.service';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
    selector: 'preview-enrollment-form',
    templateUrl: './preview-form.component.html',
    styleUrls: ['./preview-form.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class PreviewFormComponent implements OnInit {
    panelOpenState = false;
    waitlist: Waitlist;

    public sections: any[]
    // Form
    public enrollmentForm: FormGroup; // Enrollment Form
    unsubcribe: any
    bookings: FormArray;
    allergiesArray: FormArray;
    emergencyContacts: FormArray;
    filtersLoaded: Promise<boolean>;
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
    onUploadOtherHealthChecked: boolean;
    onUploadAsthmaChecked: boolean;
    onUploadBcChecked: boolean;
    uploadCourtOrdersChecked: boolean;
    newInputs: any[] = [];

    datainfo: any;
    addcarer: boolean;
    dynamicMode: boolean;
    invalidAccess: boolean;
    attendanceList: any;
    allChecked: boolean;
    indeterminate: boolean;
    attendanceFormStatus: string;

    newbooking: any[] = [{
        address: ''

    }];
    branchDetails: any;

    checkBoxes: any = [];
    // common
    buttonLoader: boolean;
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive

    // @Output()
    // listAdded: EventEmitter<any>;

    @ViewChild('captchaElem') recaptchaComponent: ReCaptcha2Component;
    _modalService: any;
    signaturesList: any = [];

    /**
     *
     * @param _formBuilder
     * @param _logger
     * @param _route
     * @param _errorService
     */

    constructor(
        private _formBuilder: FormBuilder,
        private _enrollmentService: EnrollmentsService,
        private _notification: NotificationService,
        private _route: ActivatedRoute,
        private _commonService: CommonService,
        private _dialogService: MatDialog,
        private _auth: AuthService,
        private _sectionService: SectionService,
        public matDialogRef: MatDialogRef<PreviewFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
        // private _sectionService: SectionService,
    ) {
        this.branchDetails = this._auth.getClient();
        this.currentYear = new Date().getFullYear();
        this.recaptchaSiteKey = AppConst.appKeys.recaptchaKey;
        this.buttonLoader = false;
        this.isSubmitted = false;
        this.userExist = false;
        this.religiousrequirementschecked = false;
        this.culturalrequirementschecked = false;
        this.uploadHealthRecrdChecked = false;
        this.onUploadImmunisedRecordChecked = false;
        this.onUploadPrescribedMedicineChecked = false;
        this.onUploadAnaphylaxisChecked = false;
        this.onUploadOtherHealthChecked = false;
        this.onUploadAsthmaChecked = false;
        this.onUploadBcChecked = false;
        this.uploadCourtOrdersChecked = false;
        this.sections = data.sections;
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

        this.allergiesList = [
            'Anaphylaxis',
            'Allergy',
            'Asthma',
            'Diabetes',
        ];

        this.emergency = [
            'Collection',
            'Emergency',
            'Medical',
            'Excursion'
        ];

        this.dynamicMode = false;
        this.invalidAccess = false;
        this.addcarer = false;
        // this.listAdded = new EventEmitter();

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     *  On Init
     */
    ngOnInit(): void {

        // this._createForm();
        this._setInitData();
        this._setSectionElementsData();

        // this._setScrollDirective();
        // if (this.datainfo) {
        //
        //     this.setChildFormValues();
        //
        // }
        // this.removeEmergencyContact(0);
        // this.enrollmentForm = this._createForm();

    }

    _setSectionElementsData() {
        this.enrollmentForm = new FormGroup({
            agreement: new FormControl(false, Validators.requiredTrue),
            recaptcha: new FormControl('', Validators.required),
            // recaptcha: new FormControl('xx'),
        });
        this.sections.forEach(g => {
            this.enrollmentForm.addControl(g.section_code, new FormGroup({})) // section_code group create
            const section = this.enrollmentForm.get(g.section_code) as FormGroup; // get section_code group to section constance
            g.inputs.forEach(x => {
                // console.log(x)
                if ('culturalRequirements' == x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.maxLength(150)] : null),
                        ['types']: new FormGroup({
                            ['cultuaral_requirements_switch']: new FormControl(''),
                        }),
                    }))
                } else if ('religiousRequirements' == x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.maxLength(150)] : null),
                        ['types']: new FormGroup({
                            ['religious_requirements_switch']: new FormControl('')
                        }),
                    }))
                } else if ('preferedDate' == x.input_name) {
                    section.addControl(x.input_name, this._formBuilder.array([this.addBookingGroup()]))
                } else if ('addAllergy' == x.input_name) {
                    section.addControl(x.input_name, this._formBuilder.array([]))
                } else if ('addEmergencyContact' == x.input_name) {
                    section.addControl(x.input_name, this._formBuilder.array([]))
                } else if ('checkbox' == x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl(false, null),
                    }))
                } else if ('select-multiple' == x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl([], (x.input_mandatory) ? [Validators.required] : null),
                    }))
                } else if ('email' == x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.email] : Validators.email),
                    }))
                } else {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.maxLength(150)] : null),
                    }))
                }
                /*new inputs keep in a array*/
                if (x.status == 'new') {
                    this.newInputs.push(x.input_name)
                }

                if ('signature' === x.input_type) {
                    this.signaturesList.push({
                        name: x.input_name,
                        required: x.input_mandatory,
                        section: g.section_code,
                        value: ''
                    });
                }
            })

            section.addControl('section_settings', new FormGroup({
                ['mandatory']: new FormControl(g.mandatory),
                ['section_position_static']: new FormControl(g.section_position_static),
                ['section_order']: new FormControl(g.section_order),
                ['section_hide']: new FormControl(g.section_hide),
                ['section_name']: new FormControl(g.title),
                ['section_id']: new FormControl(g.id),
            }))

        })
        // console.log('new inputs')
        // console.log(this.newInputs)
        // console.log('new inputs end')
    }

    getFields() {
        return this.sections;
    }

    ngDistroy() {
        this.unsubcribe();
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

    /**
     * On Destroy
     */
    ngOnDestroy(): void {

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
        const resolverSections = this._route.snapshot.data['sectionsSet'];
        if (!_.isEmpty(resolverSections)) {
            // console.log('xxx');
            // console.log(resolverSections['data']);
            // console.log('yyy');

            this.sections = resolverSections['data'];
        }


    }


    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */

    _createForm(): FormGroup {


        return this._formBuilder.group({

            firstname: new FormControl(),
            agreement: [false, Validators.required],
            recaptcha: ['', Validators.required],
        });
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

    get bookingArray() {
        return this.enrollmentForm.get('bookings') as FormArray;
    }

    addBooking() {
        this.bookingArray.push(this.addBookingGroup());
    }

    removeBooking(index) {
        this.bookingArray.removeAt(index);
    }

    //----------Allergies---------------

    addAllergyGroup(): FormGroup {
        return this._formBuilder.group({
            allergies: [null],
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
        return this.enrollmentForm.get('emergencyContacts') as FormArray;
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

    /**
     * convenience getter for easy access to form fields
     */
    get fv(): any {
        return this.enrollmentForm.value
    }

    onFormSubmit(e: MouseEvent): void {
        if (this.enrollmentForm.invalid) {
            return;
        }

        const formValues = this.enrollmentForm.value
        delete formValues['agreement'];
        delete formValues['recaptcha'];
        const newInputsCollection = [];
        // console.log('xxxxxxxxxxx')
        // console.log(formValues);
        for (const val in formValues) {
            const sectionStore = [];
            for (const newInput of this.newInputs) {/*index name with  get relevant  new inputs*/
                if (formValues[val][newInput]) {
                    sectionStore.push({
                        values: formValues[val][newInput][newInput],
                        name: newInput
                    })
                }
            }
            if (sectionStore.length > 0) {
                newInputsCollection.push({
                    section: val,
                    section_id: formValues[val]['section_settings']['section_id'],
                    data: sectionStore
                })
            }

        }
        // console.log(newInputsCollection);


        this.buttonLoader = true;
        const sendData =
            {
                org_id: this.branchDetails.organizationId,
                branch_id: this.branchDetails.id,

                waitlist_id: ((this.datainfo) ? this.datainfo.id : ''),
                child_first_name: ((this.fv.child_information?.firstname?.firstname !== undefined) ? this.fv.child_information.firstname.firstname : ''),
                child_middle_name: ((this.fv.child_information?.middlename?.middlename !== undefined) ? this.fv.child_information.middlename.middlename : ''),
                child_last_name: ((this.fv.child_information?.lastname?.lastname !== undefined) ? this.fv.child_information.lastname.lastname : ''),
                child_dob: ((this.fv.child_information?.dateOfBirth?.dateOfBirth !== undefined) ? DateTimeHelper.getUtcDate(this.fv.child_information.dateOfBirth.dateOfBirth) : ''),
                child_crn: ((this.fv.child_information?.crn?.crn !== undefined) ? this.fv.child_information.crn.crn : ''),
                child_enrolment_date: ((this.fv.booking_details?.startDate?.startDate !== undefined) ? DateTimeHelper.getUtcDate(this.fv.booking_details.startDate.startDate) : ''),
                child_gender: ((this.fv.child_information?.childGender?.childGender !== undefined) ? this.fv.child_information.childGender.childGender : ''),
                sibilings: ((this.fv.child_information?.siblingAttend?.siblingAttend !== undefined) ? this.fv.child_information.siblingAttend.siblingAttend : ''),
                child_address: ((this.fv.child_information?.childAddress?.childAddress !== undefined) ? this.fv.child_information.childAddress.childAddress : ''),
                child_state: ((this.fv.child_information?.child_state?.child_state !== undefined) ? this.fv.child_information.child_state.child_state : ''),
                child_suburb: ((this.fv.child_information?.childSuburb?.childSuburb !== undefined) ? this.fv.child_information.childSuburb.childSuburb : ''),
                child_postcode: ((this.fv.child_information?.childPostcode?.childPostcode !== undefined) ? this.fv.child_information.childPostcode.childPostcode : ''),
                //
                courtorders_chk: ((this.fv.child_information?.courtAppointed?.courtAppointed !== undefined) ? this.fv.child_information.courtAppointed.courtAppointed : ''),
                parent_first_name: ((this.fv.parent_guardian?.parentFirstname?.parentFirstname !== undefined) ? this.fv.parent_guardian.parentFirstname.parentFirstname : ''),
                parent_middle_name: ((this.fv.parent_guardian?.parentmiddlename?.parentmiddlename !== undefined) ? this.fv.parent_guardian.parentmiddlename.parentmiddlename : ''),
                parent_last_name: ((this.fv.parent_guardian?.parentlastname?.parentlastname !== undefined) ? this.fv.parent_guardian.parentlastname.parentlastname : ''),
                parent_dob: ((this.fv.parent_guardian?.parentdateOfBirth?.parentdateOfBirth !== undefined) ? DateTimeHelper.getUtcDate(this.fv.parent_guardian.parentdateOfBirth.parentdateOfBirth) : ''),
                parent_email: ((this.fv.parent_guardian?.parentEmail?.parentEmail !== undefined) ? this.fv.parent_guardian.parentEmail.parentEmail : ''),
                parent_address: ((this.fv.parent_guardian?.parentAddress?.parentAddress !== undefined) ? this.fv.parent_guardian.parentAddress.parentAddress : ''),
                parent_suburb: ((this.fv.parent_guardian?.parentSuburb?.parentSuburb !== undefined) ? this.fv.parent_guardian.parentSuburb.parentSuburb : ''),
                parent_country: ((this.fv.parent_guardian?.parentCountry?.parentCountry !== undefined) ? this.fv.parent_guardian.parentCountry.parentCountry : ''),
                parent_postalCode: ((this.fv.parent_guardian?.parentPC?.parentPC !== undefined) ? this.fv.parent_guardian.parentPC.parentPC : ''),
                parent_state: ((this.fv.parent_guardian?.parentState?.parentState !== undefined) ? this.fv.parent_guardian.parentState.parentState : ''),
                parent_phone: ((this.fv.parent_guardian?.parentPhone?.parentPhone !== undefined) ? this.fv.parent_guardian.parentPhone.parentPhone : ''),
                parent_mobile: ((this.fv.parent_guardian?.parentMobile?.parentMobile !== undefined) ? this.fv.parent_guardian.parentMobile.parentMobile : ''),
                bookings: ((this.fv.booking_details?.preferedDate !== undefined) ? this.fv.booking_details.preferedDate : ''),
                allergiesArray: ((this.fv.health_information?.addAllergy !== undefined) ? this.fv.health_information.addAllergy : ''),
                child_circumstances: ((this.fv.child_information?.childCircumstances?.childCircumstances !== undefined) ? this.fv.child_information.childCircumstances.childCircumstances : ''),
                child_aboriginal: ((this.fv.cultural_background?.straitIslande?.straitIslande !== undefined) ? this.fv.cultural_background.straitIslande.straitIslande : ''),
                cultural_background: ((this.fv.cultural_background?.culturalBackground?.culturalBackground !== undefined) ? this.fv.cultural_background.culturalBackground.culturalBackground : ''),
                spoken_language: ((this.fv.cultural_background?.spokenHome?.spokenHome !== undefined) ? this.fv.cultural_background.spokenHome.spokenHome : ''),
                cultural_requirement_chk: ((this.fv.cultural_background?.culturalRequirements?.culturalRequirements !== undefined) ? this.fv.cultural_background.culturalRequirements.culturalRequirements : ''),
                cultural_requirement: ((this.fv.cultural_background?.culturalRequirements?.types.cultuaral_requirements_switch !== undefined) ? this.fv.cultural_background.culturalRequirements.types.cultuaral_requirements_switch : ''),
                religious_requirements_chk: ((this.fv.cultural_background?.religiousRequirements?.religiousRequirements !== undefined) ? this.fv.cultural_background.religiousRequirements.religiousRequirements : ''),
                religious_requirements: ((this.fv.cultural_background?.religiousRequirements?.types.religious_requirements_switch !== undefined) ? this.fv.cultural_background.religiousRequirements.types.religious_requirements_switch : ''),
                expected_start_date: ((this.fv.booking_details?.startDate?.startDate !== undefined) ? this.fv.booking_details.startDate.startDate : ''),
                // // mornings
                child_medical_number: ((this.fv.health_information?.medicareNumber?.medicareNumber !== undefined) ? this.fv.health_information.medicareNumber.medicareNumber : ''),
                child_medicalexpiry_date: ((this.fv.health_information?.medicareExopiry?.medicareExopiry !== undefined) ? DateTimeHelper.getUtcDate(this.fv.health_information.medicareExopiry.medicareExopiry) : ''),
                ambulance_cover_no: ((this.fv.health_information?.ambulanceCover?.ambulanceCover !== undefined) ? this.fv.health_information.ambulanceCover.ambulanceCover : ''),
                child_heallth_center: ((this.fv.health_information?.healthCentre?.healthCentre !== undefined) ? this.fv.health_information.healthCentre.healthCentre : ''),
                practitioner_name: ((this.fv.health_information?.medicalService?.medicalService !== undefined) ? this.fv.health_information.medicalService.medicalService : ''),
                practitioner_address: ((this.fv.health_information?.medicalServiceAddress?.medicalServiceAddress !== undefined) ? this.fv.health_information.medicalServiceAddress.medicalServiceAddress : ''),
                practitioner_phoneNo: ((this.fv.health_information?.medicalServicePhone?.medicalServicePhone !== undefined) ? this.fv.health_information.medicalServicePhone.medicalServicePhone : ''),
                health_record_chk: ((this.fv.health_information?.healthRecord?.healthRecord !== undefined) ? this.fv.health_information.healthRecord.healthRecord : ''),
                immunised_chk: ((this.fv.health_information?.childImmunised?.childImmunised !== undefined) ? this.fv.health_information.childImmunised.childImmunised : ''),
                prescribed_medicine_chk: ((this.fv.health_information?.prescribedMedicine?.prescribedMedicine !== undefined) ? this.fv.health_information.prescribedMedicine.prescribedMedicine : ''),
                detailsOfAllergies: ((this.fv.health_information?.addAllergy !== undefined) ? this.fv.health_information.addAllergy : ''),
                anaphylaxis_chk: ((this.fv.health_information?.anaphylaxis?.anaphylaxis !== undefined) ? this.fv.health_information.anaphylaxis.anaphylaxis : ''),
                birth_certificate: ((this.fv.health_information?.birthCertificate?.birthCertificate !== undefined) ? this.fv.health_information.birthCertificate.birthCertificate : ''),
                asthma_chk: ((this.fv.health_information?.asthma?.asthma !== undefined) ? this.fv.health_information.asthma.asthma : ''),
                other_health_conditions_chk: ((this.fv.health_information?.healthConditions?.healthConditions !== undefined) ? this.fv.health_information.healthConditions.healthConditions : ''),
                epipen_chk: ((this.fv.health_information?.epipenOrAnipen?.epipenOrAnipen !== undefined) ? this.fv.health_information.epipenOrAnipen.epipenOrAnipen : ''),
                //parent new details:
                relationship: ((this.fv.parent_guardian?.relationToChild?.relationToChild !== undefined) ? this.fv.parent_guardian.relationToChild.relationToChild : ''),
                work_address: ((this.fv.parent_guardian?.parentWorkAddress?.parentWorkAddress !== undefined) ? this.fv.parent_guardian.parentWorkAddress.parentWorkAddress : ''),
                work_phone: ((this.fv.parent_guardian?.parentWorkPN?.parentWorkPN !== undefined) ? this.fv.parent_guardian.parentWorkPN.parentWorkPN : ''),
                work_email: ((this.fv.parent_guardian?.parentWorkEmailAddress?.parentWorkEmailAddress !== undefined) ? this.fv.parent_guardian.parentWorkEmailAddress.parentWorkEmailAddress : ''),
                occupation: ((this.fv.parent_guardian?.parentOccupation?.parentOccupation !== undefined) ? this.fv.parent_guardian.parentOccupation.parentOccupation : ''),
                consent_incursion: ((this.fv.parent_guardian?.authorizedNominieeIncursion !== undefined) ? this.fv.parent_guardian.authorizedNominieeIncursion : ''),
                consent_make_medical_decision: ((this.fv.parent_guardian?.authNomiColectMedical !== undefined) ? this.fv.parent_guardian.authNomiColectMedical : ''),
                consent_emergency_contact: ((this.fv.parent_guardian?.consentEmenrgencyContact !== undefined) ? this.fv.parent_guardian.consentEmenrgencyContact : ''),
                consent_collect_child: ((this.fv.parent_guardian?.authorizedNominieeColect !== undefined) ? this.fv.parent_guardian.authorizedNominieeColect : ''),
                parent_spoken_language: ((this.fv.parent_guardian?.parentSH?.parentSH !== undefined) ? this.fv.parent_guardian.parentSH.parentSH : ''),
                parent_cultural_background: ((this.fv.parent_guardian?.parentCB?.parentCB !== undefined) ? this.fv.parent_guardian.parentCB.parentCB : ''),
                parent_aboriginal: ((this.fv.parent_guardian?.parentStraitIslande?.parentStraitIslande !== undefined) ? this.fv.parent_guardian.parentStraitIslande.parentStraitIslande : ''),
                parent_crn: ((this.fv.parent_guardian?.parentprimaryCarer?.parentprimaryCarer !== undefined) ? this.fv.parent_guardian.parentprimaryCarer.parentprimaryCarer : ''),
                // carer details
                carer_relationship: ((this.fv.additional_carer_details?.relationToChild?.relationToChild !== undefined) ? this.fv.additional_carer_details.relationToChild.relationToChild : ''),
                carer_firstname: ((this.fv.additional_carer_details?.addtionalFirstname?.addtionalFirstname !== undefined) ? this.fv.additional_carer_details.addtionalFirstname.addtionalFirstname : ''),
                carer_middlename: ((this.fv.additional_carer_details?.addtionalmiddlename?.addtionalmiddlename !== undefined) ? this.fv.additional_carer_details.addtionalmiddlename.addtionalmiddlename : ''),
                carer_lastname: ((this.fv.additional_carer_details?.addtionallastname?.addtionallastname !== undefined) ? this.fv.additional_carer_details.addtionallastname.addtionallastname : ''),
                carer_dob: ((this.fv.additional_carer_details?.addtionaldateOfBirth?.addtionaldateOfBirth !== undefined) ? DateTimeHelper.getUtcDate(this.fv.additional_carer_details.addtionaldateOfBirth.addtionaldateOfBirth) : ''),
                carer_email: ((this.fv.additional_carer_details?.carerEmail?.carerEmail !== undefined) ? this.fv.additional_carer_details.carerEmail.carerEmail : ''),
                carer_address: ((this.fv.additional_carer_details?.addtionalAddress?.addtionalAddress !== undefined) ? this.fv.additional_carer_details.addtionalAddress.addtionalAddress : ''),
                carer_suburb: ((this.fv.additional_carer_details?.addtionalSuburb?.addtionalSuburb !== undefined) ? this.fv.additional_carer_details.addtionalSuburb.addtionalSuburb : ''),
                carer_country: ((this.fv.additional_carer_details?.additionalCarerCountry?.additionalCarerCountry !== undefined) ? this.fv.additional_carer_details.additionalCarerCountry.additionalCarerCountry : ''),
                carer_postalCode: ((this.fv.additional_carer_details?.addtionalPC?.addtionalPC !== undefined) ? this.fv.additional_carer_details.addtionalPC.addtionalPC : ''),
                carer_state: ((this.fv.additional_carer_details?.addtionalState?.addtionalState !== undefined) ? this.fv.additional_carer_details.addtionalState.addtionalState : ''),
                carer_phone: ((this.fv.additional_carer_details?.addtionalPhone?.addtionalPhone !== undefined) ? this.fv.additional_carer_details.addtionalPhone.addtionalPhone : ''),
                carer_mobile: ((this.fv.additional_carer_details?.addtionalMobile?.addtionalMobile !== undefined) ? this.fv.additional_carer_details.addtionalMobile.addtionalMobile : ''),
                carer_work_address: ((this.fv.additional_carer_details?.addtionalWorkAddress?.addtionalWorkAddress !== undefined) ? this.fv.additional_carer_details.addtionalWorkAddress.addtionalWorkAddress : ''),
                carer_work_phone: ((this.fv.additional_carer_details?.addtionalWorkPN?.addtionalWorkPN !== undefined) ? this.fv.additional_carer_details.addtionalWorkPN.addtionalWorkPN : ''),
                carer_work_email: ((this.fv.additional_carer_details?.addtionalWorkEmailAddress?.addtionalWorkEmailAddress !== undefined) ? this.fv.additional_carer_details.addtionalWorkEmailAddress.addtionalWorkEmailAddress : ''),
                carer_occupation: ((this.fv.additional_carer_details?.addtionalOccupation?.addtionalOccupation !== undefined) ? this.fv.additional_carer_details.addtionalOccupation.addtionalOccupation : ''),
                carer_consent_incursion: ((this.fv.additional_carer_details?.addiAuthNomiColMedi !== undefined) ? this.fv.additional_carer_details.addiAuthNomiColMedi : ''),
                care_consent_mak_medi_deci: ((this.fv.additional_carer_details?.addiAuthNomiColMedi !== undefined) ? this.fv.additional_carer_details.addiAuthNomiColMedi : ''),
                care_consent_eme_contact: ((this.fv.additional_carer_details?.AddiConsentEmenrgencyContact !== undefined) ? this.fv.additional_carer_details.AddiConsentEmenrgencyContact : ''),
                carer_consent_collect_child: ((this.fv.additional_carer_details?.AddiAuthorizedNominieeColect !== undefined) ? this.fv.additional_carer_details.AddiAuthorizedNominieeColect : ''),
                carer_spoken_language: ((this.fv.additional_carer_details?.addtionalSH?.addtionalSH !== undefined) ? this.fv.additional_carer_details.addtionalSH.addtionalSH : ''),
                carer_cultural_background: ((this.fv.additional_carer_details?.addtionalCB?.addtionalCB !== undefined) ? this.fv.additional_carer_details.addtionalCB.addtionalCB : ''),
                carer_aboriginal: ((this.fv.additional_carer_details?.addtionalStraitIslande?.addtionalStraitIslande !== undefined) ? this.fv.additional_carer_details.addtionalStraitIslande.addtionalStraitIslande : ''),
                addition_carer_crn: ((this.fv.additional_carer_details?.addtionalprimaryCarer?.addtionalprimaryCarer !== undefined) ? this.fv.additional_carer_details.addtionalprimaryCarer.addtionalprimaryCarer : ''),

                emergency: [{
                    ec_firstname: ((this.fv.emergency_contact_details?.emenrgencyFirtsName?.emenrgencyFirtsName !== undefined) ? this.fv.emergency_contact_details.emenrgencyFirtsName.emenrgencyFirtsName : ''),
                    ec_lastname: ((this.fv.emergency_contact_details?.emenrgencylastName?.emenrgencylastName !== undefined) ? this.fv.emergency_contact_details.emenrgencylastName.emenrgencylastName : ''),
                    ec_address: ((this.fv.emergency_contact_details?.emenrgencyhomeAddress?.emenrgencyhomeAddress !== undefined) ? this.fv.emergency_contact_details.emenrgencyhomeAddress.emenrgencyhomeAddress : ''),
                    ec_phone: ((this.fv.emergency_contact_details?.emenrgencyPhone?.emenrgencyPhone !== undefined) ? this.fv.emergency_contact_details.emenrgencyPhone.emenrgencyPhone : ''),
                    ec_email: ((this.fv.emergency_contact_details?.emenrgencyEmail?.emenrgencyEmail !== undefined) ? this.fv.emergency_contact_details.emenrgencyEmail.emenrgencyEmail : ''),
                    emergencyType: ((this.fv.emergency_contact_details?.emenrgencyType !== undefined) ? this.fv.emergency_contact_details.emenrgencyType : ''),
                    ec_relationship: ((this.fv.emergency_contact_details?.emenrgencyRelationship?.emenrgencyRelationship !== undefined) ? this.fv.emergency_contact_details.emenrgencyRelationship.emenrgencyRelationship : ''),
                    ec_consent_incursion: ((this.fv.emergency_contact_details?.emeAddiAuthNomiColMedi !== undefined) ? this.fv.emergency_contact_details.emeAddiAuthNomiColMedi : ''),
                    ec_consent_make_medical_decision: ((this.fv.emergency_contact_details?.emeAddiAuthNomiColMedi !== undefined) ? this.fv.emergency_contact_details.emeAddiAuthNomiColMedi : ''),
                    ec_consent_emergency_contact: ((this.fv.emergency_contact_details?.emenrgencyContact !== undefined) ? this.fv.emergency_contact_details.emenrgencyContact : ''),
                    ec_consent_collect_child: ((this.fv.emergency_contact_details?.emAddiAuthNomiColect !== undefined) ? this.fv.emergency_contact_details.emAddiAuthNomiColect : ''),
                }, ...(this.fv.emergency_contact_details?.addEmergencyContact !== undefined) ? this.fv.emergency_contact_details.addEmergencyContact : []],
                //
                // //additional consents
                consent1: ((this.fv.consents?.consent1?.consent1 !== undefined) ? this.fv.consents.consent1.consent1 : ''),
                consent2: ((this.fv.consents?.consent2?.consent2 !== undefined) ? this.fv.consents.consent2.consent2 : ''),
                consent3: ((this.fv.consents?.consent3?.consent3 !== undefined) ? this.fv.consents.consent3.consent3 : ''),
                consent4: ((this.fv.consents?.consent4?.consent4 !== undefined) ? this.fv.consents.consent4.consent4 : ''),
                consent5: ((this.fv.consents?.consent5?.consent5 !== undefined) ? this.fv.consents.consent5.consent5 : ''),
                consent6: ((this.fv.consents?.consent6?.consent6 !== undefined) ? this.fv.consents.consent6.consent6 : ''),
                consent7: ((this.fv.consents?.consent7?.consent7 !== undefined) ? this.fv.consents.consent7.consent7 : ''),
                consent8: ((this.fv.consents?.consent8?.consent8 !== undefined) ? this.fv.consents.consent8.consent8 : ''),
                new_inputs: newInputsCollection
                // consent9: this.fv.consents.consent9.consent9,
                // consent10: this.fc.consent10.value,
                // consent11: this.fc.consent11.value,
                // consent12: this.fc.consent12.value,
            }
        // console.log(sendData);

        // console.log('sendData');
        // console.log(sendData);
        // console.log('sendDataEnd');
        // return;
        this._enrollmentService.enrollChildMasterData(sendData)
            .pipe()
            .subscribe((code: string) => {
                // console.log(code);
                if (!code) {
                    this.buttonLoader = false;
                    return;
                }
                if (code === '200') {
                    setTimeout(() => this._notification.displaySnackBar('success', NotifyType.SUCCESS), 200);

                }
                this._notification.clearSnackBar();

                // setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                setTimeout(() => {
                    this.isSubmitted = true;
                    this.buttonLoader = false;
                    if (this.scrollDirective) {
                        this.scrollDirective.scrollToTop();
                    }
                }, 300);
            });
    }
}

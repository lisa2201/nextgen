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
import {
    FormGroup,
    Validators,
    FormBuilder,
    FormControl,
    FormArray,
    ReactiveFormsModule,
    ValidationErrors
} from '@angular/forms';
import {trigger, state, style, transition, animate, keyframes} from '@angular/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {ActivatedRoute} from '@angular/router';
import {fuseAnimations} from '@fuse/animations';
import {ReCaptcha2Component} from 'ngx-captcha';
import {helpMotion} from 'ng-zorro-antd';
import * as _ from 'lodash';
import {AppConst} from 'app/shared/AppConst';
import {NotificationService} from 'app/shared/service/notification.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {Country} from 'app/shared/model/common.interface';
import {CommonService} from 'app/shared/service/common.service';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {Subject} from 'rxjs';
import {finalize, switchMap, takeUntil} from 'rxjs/operators';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {MatDialog} from '@angular/material/dialog';
import {DeclarationDialogComponent} from '../declaration-dialog/declaration-dialog.component';
import {Waitlist} from '../models/waitlist.model';
import {EnrollmentsService} from '../services/enrollments.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {AuthService} from 'app/shared/service/auth.service';
import {SectionService} from '../services/section.service';
import {Branch} from 'app/main/modules/branch/branch.model';
import {FileListItem} from 'app/shared/components/s3-upload/s3-upload.model';
import {YesValidator} from 'app/shared/validators/yes-validator';

@Component({
    selector: 'app-enrollment-form',
    templateUrl: './enrollment-form.component.html',
    styleUrls: ['./enrollment-form.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300}),
        trigger('flyInOut', [
            state('in', style({transform: 'translateX(0)'})),
            transition('void => *', [
                animate(
                    300,
                    keyframes([
                        style({opacity: 0, transform: 'translateX(-100%)', offset: 0}),
                        style({opacity: 1, transform: 'translateX(15px)', offset: 0.3}),
                        style({opacity: 1, transform: 'translateX(0)', offset: 1.0})
                    ])
                )
            ]),
        ])
    ]
})
export class EnrollmentFormComponent implements OnInit, OnDestroy {
    panelOpenState = false;
    waitlist: Waitlist;

    unsubscribeAll: Subject<any>;

    public sections: any[]
    // Form
    public enrollmentForm: FormGroup; // Enrollment Form
    unsubcribe: any
    bookings: FormArray;
    allergiesArray: FormArray;
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
    allInputs: any[] = [];

    datainfo: any;
    addcarer: boolean;
    dynamicMode: boolean;
    invalidAccess: boolean;
    attendanceList: any;
    allChecked: boolean;
    indeterminate: boolean;
    attendanceFormStatus: string;
    allergyTypes: any;

    siteManagerMode: boolean;
    branchSelect: FormControl;
    formLoading: boolean;
    branches: Branch[];
    orgName: string
    branchName: string

    newbooking: any[] = [{
        address: ''

    }];
    branchDetails: any;

    uploadFileMap: object;
    checkBoxes: any = [];
    // common
    buttonLoader: boolean;
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive
    uploadTypes: string;
    branchLogo: string;
    attendanceMandatory: boolean = false
    validForAttendance: boolean = false
    validateUploads: boolean = true
    uploadSwitchInputs: object = [];
    checkedUploading: boolean[] = [];
    @ViewChild('captchaElem') recaptchaComponent: ReCaptcha2Component;
    _modalService: any;
    emergencyContacts: any;
    inputWithQuestion: any[] = [];
    invalids: any[] = []
    staggeringInvalids: any[] = []
    next: number = 0;
    signaturesList: any = [];
    signatureTemp: any = [];

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
        // private _sectionService: SectionService,
    ) {
        this.uploadFileMap = {};
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
        this.sections = [];
        this.branchSelect = new FormControl(null);
        this.unsubscribeAll = new Subject();
        this.formLoading = false;
        this.branches = [];
        this.uploadTypes = 'image/*, application/pdf';
        this.branchLogo = '';
        this.siteManagerMode = this._auth._domain === AppConst.appStart.ENROLLMENT.NAME ? true : false;

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

        this.datainfo = this._route.snapshot.data['resolveData'];
        // this.listAdded = new EventEmitter();
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     *  On Init
     */
    ngOnInit(): void {
        this._setInitData();

        this.branchDetails = this._route.snapshot.data['sectionsSet']['branchData'];
        if (!this.siteManagerMode) {
            this._setSectionElementsData();
            this.orgName = this.branchDetails.org_name;
            this.branchName = this.branchDetails.name;
            this.branchLogo = (this.branchDetails.branch_logo) ? this._commonService.getS3FullLink(this.branchDetails.branch_logo) : '';
            this.getAllergyTypes(this.branchDetails.id)
        } else {
            this.orgName = this.branches.length > 0 ? this.branches[0].orgName : '';
        }

        this.branchSelect
            .valueChanges
            .pipe(
                takeUntil(this.unsubscribeAll),
                switchMap((branchId: string) => {
                    this.getAllergyTypes(branchId);
                    this.branchDetails = _.find(this.branches, {id: branchId});
                    this.branchName = this.branchDetails.name;
                    this.branchLogo = (this.branchDetails.branchLogo) ? this._commonService.getS3FullLink(this.branchDetails.branchLogo) : '';
                    return this._sectionService.enrolmentDynamicFields(branchId, AppConst.appStart.ENROLLMENT.NAME);
                })
            )
            .subscribe((value) => {

                if (value.data) {
                    this.sections = value.data;
                    this._setSectionElementsData();
                    this.emergencyContactsSettings();
                }

            });
        this._setScrollDirective();
        if (this.datainfo) {
            setTimeout(() => {
                this.setChildFormValues();
            }, 200);
        }
        if (this.branchName) {
            this.emergencyContactsSettings();
        }
    }

    emergencyContactsSettings(): void {
        const dd = [];
        this.sections[this.sections.findIndex(x => x.section_code === 'emergency_contact_details')]['inputs'].forEach(x => {
            dd.push({
                name: x.input_name,
                data: x
            })
        })
        this._enrollmentService.setEmergencyContactsSettings(dd)
        this.emergencyContacts = dd;
    }

    _setSectionElementsData(): void {
        this.enrollmentForm = new FormGroup({
            agreement: new FormControl(false, Validators.requiredTrue),
            recaptcha: new FormControl('', Validators.required),
            // recaptcha: new FormControl('xx'),
        });
        this.sections.forEach(g => {
            this.enrollmentForm.addControl(g.section_code, new FormGroup({})) // section_code group create
            const section = this.enrollmentForm.get(g.section_code) as FormGroup; // get section_code group to section constance
            g.inputs.forEach(x => {
                // from waitlist added new fields answers getting
                let newFieldAnswer: any;
                if (this.datainfo?.waitlist_info?.new_inputs !== undefined) {
                    let key = this.datainfo.waitlist_info.new_inputs.find(item => item.name === x.input_name);
                    if (key !== undefined) {
                        newFieldAnswer = key.values;
                        // console.log('newFieldAnswer');
                        // console.log(newFieldAnswer);
                    }
                }

                if ('culturalRequirements' === x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.maxLength(150)] : Validators.maxLength(150)),
                        ['types']: new FormGroup({
                            ['cultuaral_requirements_switch']: new FormControl(''),
                        }),
                    }))
                } else if ('religiousRequirements' === x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.maxLength(150)] : Validators.maxLength(150)),
                        ['types']: new FormGroup({
                            ['religious_requirements_switch']: new FormControl('')
                        }),
                    }))
                } else if ('preferedDate' === x.input_name) {
                    this.attendanceMandatory = x.input_mandatory
                    this.validForAttendance = (this.attendanceMandatory) ? false : true
                    section.addControl(x.input_name, this._formBuilder.array([this.addBookingGroup()]))
                } else if ('addAllergy' === x.input_name) {
                    section.addControl(x.input_name, this._formBuilder.array([]))
                } else if ('addEmergencyContact' === x.input_name) {
                    section.addControl(x.input_name, this._formBuilder.array([]))
                } else if ('checkbox' === x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : false, (x.input_mandatory) ? YesValidator.YesOnly : null),
                    }))
                } else if ('select-multiple' === x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : [], (x.input_mandatory) ? [Validators.required] : null),
                    }))
                } else if ('email' === x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.email, Validators.maxLength(150)] : [Validators.email, Validators.maxLength(150)]),
                    }))
                } else if ('text-area' === x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.maxLength(250)] : Validators.maxLength(250)),
                    }))
                } else if ('crn' === x.input_name || 'parentprimaryCarer' === x.input_name || 'addtionalprimaryCarer' === x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')] : [Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')]),
                    }))
                } else if ('addtionalPCR' === x.input_name || 'parentPC' === x.input_name || 'medicalServicePhone' === x.input_name || 'parentPhone' === x.input_name || 'parentWorkPN' === x.input_name || 'addtionalPhone' === x.input_name || 'addtionalWorkPN' === x.input_name || 'emenrgencyPhone' === x.input_name || 'parentMobile' === x.input_name || 'addtionalMobile' === x.input_name || 'parentWorkPN' === x.input_name || 'parentWorkMob' === x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)] : [Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]),
                    }))
                } else if ('firstname' === x.input_name || 'middlename' === x.input_name || 'lastname' === x.input_name || 'parentFirstname' === x.input_name || 'parentmiddlename' === x.input_name || 'parentlastname' === x.input_name || 'addtionalFirstname' === x.input_name || 'addtionalmiddlename' === x.input_name || 'addtionallastname' === x.input_name || 'emenrgencyFirtsName' === x.input_name || 'emenrgencylastName' === x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z 0-9_)(-]+$')] : [Validators.maxLength(150), Validators.pattern('^[a-zA-Z 0-9_)(-]+$')]),
                    }))
                } else if ('signature' === x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required] : []),
                    }))
                } else {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [('switch' === x.input_type || 'upload-switch' === x.input_type) ? YesValidator.YesOnly : Validators.required, Validators.maxLength(250)] : Validators.maxLength(250)),
                    }))
                }
                /*new inputs keep in a array*/
                // if (x.status === 'new') {
                this.allInputs.push(x.input_name)
                this.inputWithQuestion.push({name: x.input_name, question: x.question})
                // }
                if ('upload-switch' === x.input_type) {
                    this.uploadSwitchInputs[x.input_name] = {
                        name: x.input_name,
                        required: x.types?.fileUploadRequired !== undefined && x.types.fileUploadRequired
                    };
                    this.checkedUploading[x.input_name] = null;
                }

                if ('signature' === x.input_type) {
                    this.signaturesList.push({
                        name: x.input_name,
                        required: x.input_mandatory,
                        section: g.section_code,
                        value: (newFieldAnswer) ? newFieldAnswer : ''
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
    }


    setChildFormValues(): void {
        // console.log(this.datainfo.waitlist_info)
        this.enrollmentForm.get('child_information.firstname.firstname').patchValue(this.datainfo.waitlist_info.child_firstname, {emitEvent: false});
        if (!_.isEmpty(this.fv.child_information?.middlename)) {
            this.enrollmentForm.get('child_information.middlename.middlename').patchValue(this.datainfo.waitlist_info.child_middlename, {emitEvent: false});
        }
        this.enrollmentForm.get('child_information.lastname.lastname').patchValue(this.datainfo.waitlist_info.child_lastname, {emitEvent: false});
        if (!_.isEmpty(this.fv.child_information?.crn)) {
            this.enrollmentForm.get('child_information.crn.crn').patchValue(this.datainfo.waitlist_info.chil_crn, {emitEvent: false});
        }
        this.enrollmentForm.get('child_information.childGender.childGender').patchValue(this.datainfo.waitlist_info.child_gender, {emitEvent: false});
        if (!_.isEmpty(this.fv.child_information?.siblingAttend)) {
            this.enrollmentForm.get('child_information.siblingAttend.siblingAttend').patchValue(this.datainfo.waitlist_info.sibilings, {emitEvent: false});
        }
        this.enrollmentForm.get('child_information.dateOfBirth.dateOfBirth').patchValue(this.datainfo.waitlist_info.child_date_of_birth, {emitEvent: false});
        this.enrollmentForm.get('booking_details.startDate.startDate').patchValue(this.datainfo.waitlist_info.enrollment_start_date, {emitEvent: false});

        this.enrollmentForm.get('parent_guardian.parentFirstname.parentFirstname').patchValue(this.datainfo.waitlist_info.parent_firstname, {emitEvent: false});
        if (!_.isEmpty(this.fv.parent_guardian?.parentmiddlename)) {
            this.enrollmentForm.get('parent_guardian.parentmiddlename.parentmiddlename').patchValue(this.datainfo.waitlist_info.parent_middlename, {emitEvent: false});
        }
        this.enrollmentForm.get('parent_guardian.parentlastname.parentlastname').patchValue(this.datainfo.waitlist_info.parent_lastname, {emitEvent: false});
        this.enrollmentForm.get('parent_guardian.parentdateOfBirth.parentdateOfBirth').patchValue(this.datainfo.waitlist_info.parent_dob, {emitEvent: false});
        this.enrollmentForm.get('parent_guardian.parentEmail.parentEmail').patchValue(this.datainfo.waitlist_info.email, {emitEvent: false});
        if (!_.isEmpty(this.fv.parent_guardian?.parentAddress)) {
            this.enrollmentForm.get('parent_guardian.parentAddress.parentAddress').patchValue(this.datainfo.waitlist_info.parent_address, {emitEvent: false});
        }
        if (!_.isEmpty(this.fv.parent_guardian?.parentSuburb)) {
            this.enrollmentForm.get('parent_guardian.parentSuburb.parentSuburb').patchValue(this.datainfo.waitlist_info.parent_suburb, {emitEvent: false});
        }
        if (!_.isEmpty(this.fv.parent_guardian?.parentCountry)) {
            this.enrollmentForm.get('parent_guardian.parentCountry.parentCountry').patchValue(this.datainfo.waitlist_info.parent_country, {emitEvent: false});
        }
        if (!_.isEmpty(this.fv.parent_guardian?.parentPC)) {
            this.enrollmentForm.get('parent_guardian.parentPC.parentPC').patchValue(this.datainfo.waitlist_info.parent_postalCode, {emitEvent: false});
        }
        if (!_.isEmpty(this.fv.parent_guardian?.parentState)) {
            this.enrollmentForm.get('parent_guardian.parentState.parentState').patchValue(this.datainfo.waitlist_info.parent_state, {emitEvent: false});
        }
        this.enrollmentForm.get('parent_guardian.parentPhone.parentPhone').patchValue(this.datainfo.waitlist_info.parent_phone, {emitEvent: false});
        if (!_.isEmpty(this.fv.parent_guardian?.parentMobile)) {
            this.enrollmentForm.get('parent_guardian.parentMobile.parentMobile').patchValue(this.datainfo.waitlist_info.parent_mobile, {emitEvent: false});
        }
        if (!_.isEmpty(this.fv.parent_guardian?.parentprimaryCarer)) {
            this.enrollmentForm.get('parent_guardian.parentprimaryCarer.parentprimaryCarer').patchValue(this.datainfo.waitlist_info.parent_crn, {emitEvent: false});
        }
        this.enrollmentForm.get('booking_details.preferedDate').patchValue([{
            monday: this.datainfo.waitlist_info.bookings['monday'],
            tuesday: this.datainfo.waitlist_info.bookings['tuesday'],
            wednesday: this.datainfo.waitlist_info.bookings['wednesday'],
            thursday: this.datainfo.waitlist_info.bookings['thursday'],
            friday: this.datainfo.waitlist_info.bookings['friday'],
            allDays: this.datainfo.waitlist_info.bookings['allDays'],
            // saturday: this.datainfo.waitlist_info.bookings['saturday'],
            // sunday: this.datainfo.waitlist_info.bookings['sunday'],
        }], {emitEvent: false})
        //
        // //parent details

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
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
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
        const resolverSections = this._route.snapshot.data['sectionsSet'];
        if (this.siteManagerMode) {
            this.branches = resolverSections;
        } else {

            if (!_.isEmpty(resolverSections['formSettings'])) {
                this.sections = resolverSections['formSettings']['data'];
            }

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
            allDays: [false],
            // saturday: [false],
            // sunday: [false]

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

    showInvalidInputs(): void {
        this.invalids = [];
        this.staggeringInvalids = [];
        this.next = 0;
        Object.keys(this.enrollmentForm.controls).forEach(key => {
                if (this.enrollmentForm.controls[key]['controls']) {
                    Object.keys(this.enrollmentForm.controls[key]['controls']).forEach(key2 => {
                        if (this.enrollmentForm.controls[key]['controls'][key2]) {
                            if (Object.keys(this.enrollmentForm.controls[key]['controls'][key2]['controls']).length > 0) {
                                if (key2 === 'addEmergencyContact') {
                                    Object.keys(this.enrollmentForm.controls[key]['controls'][key2]['controls']).forEach(key5 => {
                                        if (Object.keys(this.enrollmentForm.controls[key]['controls'][key2]['controls'][key5]['controls']).length > 0) {
                                            Object.keys(this.enrollmentForm.controls[key]['controls'][key2]['controls'][key5]['controls']).forEach(key6 => {
                                                if (this.enrollmentForm.controls[key]['controls'][key2]['controls'][key5].get(key6).errors) {
                                                    const controlErrors: ValidationErrors = this.enrollmentForm.controls[key]['controls'][key2]['controls'][key5].get(key6).errors;
                                                    if (controlErrors != null) {
                                                        Object.keys(controlErrors).forEach(keyError => {
                                                            let question = (this.inputWithQuestion[this.inputWithQuestion.findIndex(x => x.name === key6)]['question']).replace(/<\/?[^>]+(>|$)/g, '');
                                                            question = question.length > 20 ? question.substr(0, 20) + '...' : question;
                                                            this.invalids.push({
                                                                text: this.getErrorString(keyError, controlErrors, question),
                                                                id: key6 + '_' + key5
                                                            })
                                                        })
                                                    }
                                                }
                                            })
                                        }
                                    })
                                }
                                Object.keys(this.enrollmentForm.controls[key]['controls'][key2]['controls']).forEach(key4 => {
                                    if (this.enrollmentForm.controls[key]['controls'][key2].get(key4).errors) {
                                        const controlErrors: ValidationErrors = this.enrollmentForm.controls[key]['controls'][key2].get(key4).errors;
                                        if (controlErrors != null) {
                                            Object.keys(controlErrors).forEach(keyError => {
                                                let question = (this.inputWithQuestion[this.inputWithQuestion.findIndex(x => x.name === key4)]['question']).replace(/<\/?[^>]+(>|$)/g, '');
                                                question = question.length > 20 ? question.substr(0, 20) + '...' : question;
                                                this.invalids.push({
                                                    text: this.getErrorString(keyError, controlErrors, question),
                                                    id: key4
                                                })
                                                // console.log('Key control: ' + key4 + ', keyError: ' + keyError + ', err value: ', controlErrors[keyError]);
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    })
                }
            }
        )

        /* manually add validations*/

        /*attendance*/
        if (!this.validForAttendance) {
            this.invalids.push({text: 'preferred days are required!`', id: 'preferedDate'})
        }

        /*file uploads*/
        if (!this.validateUploads) {
            this.invalids.push({text: 'file upload required for respective fields!`', id: 'enrollment'})
        }

        if (this.invalids.length === 0 && this.enrollmentForm.invalid) {
            this.invalids.push({
                text: 'You need agreed the condition of enrolment Or tik on Recaptcha!`',
                id: 'enrollment'
            })
        }
        this.doNext();
    }

    getErrorString(keyError, controlErrors, question): void {
        let text;
        switch (keyError) {
            case 'required':
                text = `${question} is required!`;
                break;
            case 'pattern':
                text = `${question} has wrong pattern!`;
                break;
            case 'email':
                text = `${question} has wrong email format!`;
                break;
            case 'minlength':
                text = `${question} has wrong length! Required length: ${controlErrors.minlength.requiredLength}`;
                break;
            case 'maxlength':
                text = `${question} has wrong length! Required length: ${controlErrors.maxlength.requiredLength}`;
                break;
            case 'areEqual':
                text = `${question} must be equal!`;
                break;
            case 'requireValue':
                text = `${question} must be checked!`;
                break;
            default:
                text = `${question}: ${'error can recognize'}: ${''}`;
        }

        return text;
    }

    doNext(): void {
        if (this.next < this.invalids.length) {
            this.staggeringInvalids.push(this.invalids[this.next++]);
        }
    }

    onFormSubmit(e: MouseEvent): void {
        if (this.enrollmentForm.invalid || !this.validForAttendance || !this.validateUploads) {
            this.showInvalidInputs()
            return;
        }

        const tot = [];/* selected checkboxes values for input fields*/
        for (const y of this.allInputs) {
            const adjust = [];
            for (const i of this.checkBoxes) {
                if (y === i.name) {
                    adjust.push(i.value);
                }
            }
            tot[y] = (adjust)

            /* signatures fill */
            for (const i of this.signaturesList) {
                if (y === i.name) {
                    tot[y] = i.value;
                }
            }

        }

        const formValues = this.enrollmentForm.value
        delete formValues['agreement'];
        delete formValues['recaptcha'];
        const allInputsCollection = [];

        for (const val in formValues) {
            const sectionStore = [];
            for (const newInput of this.allInputs) {/*index name with  get relevant  new inputs*/
                if (formValues[val][newInput]) {
                    let answer = {};
                    if (newInput === 'preferedDate') {
                        answer = {
                            values: ((this.fv.booking_details?.preferedDate !== undefined) ? this.fv.booking_details.preferedDate : []),
                            name: newInput
                        }
                    } else if (newInput === 'addAllergy') {
                        answer = {
                            values: ((this.fv.health_information?.addAllergy !== undefined) ? this.fv.health_information.addAllergy : []),
                            name: newInput
                        }
                    } else if (newInput === 'addEmergencyContact') {
                        answer = {
                            values: this.getEmergencyArrayFinal(),
                            name: newInput
                        }
                    } else {
                        answer = {
                            values: (tot[newInput].length > 0) ? tot[newInput] : formValues[val][newInput][newInput],
                            name: newInput
                        }
                    }
                    sectionStore.push(answer)

                }
            }
            if (sectionStore.length > 0) {
                allInputsCollection.push({
                    section: val,
                    section_id: formValues[val]['section_settings']['section_id'],
                    data: sectionStore
                })
            }

        }
        // console.log(allInputsCollection);
        // return;
        const sendData =
            {
                org_id: this.branchDetails.org ? this.branchDetails.org : this.branchDetails.orgId,
                branch_id: this.branchDetails.id,
                form: AppConst.appStart.ENROLLMENT.NAME,

                waitlist_id: ((this.datainfo) ? this.datainfo.id : ''),
                child_first_name: (!_.isEmpty(this.fv.child_information?.firstname) ? this.fv.child_information.firstname.firstname : ''),
                child_middle_name: (!_.isEmpty(this.fv.child_information?.middlename) ? this.fv.child_information.middlename.middlename : ''),
                child_last_name: (!_.isEmpty(this.fv.child_information?.lastname) ? this.fv.child_information.lastname.lastname : ''),
                child_dob: (!_.isEmpty(this.fv.child_information?.dateOfBirth) ? DateTimeHelper.getUtcDate(this.fv.child_information.dateOfBirth.dateOfBirth) : ''),
                child_crn: (!_.isEmpty(this.fv.child_information?.crn) ? this.fv.child_information.crn.crn : ''),
                child_enrolment_date: (!_.isEmpty(this.fv.booking_details?.startDate) ? DateTimeHelper.getUtcDate(this.fv.booking_details.startDate.startDate) : ''),
                child_gender: (!_.isEmpty(this.fv.child_information?.childGender) ? this.fv.child_information.childGender.childGender : ''),
                sibilings: (!_.isEmpty(this.fv.child_information?.siblingAttend) ? this.fv.child_information.siblingAttend.siblingAttend : ''),
                child_address: (!_.isEmpty(this.fv.child_information?.childAddress) ? this.fv.child_information.childAddress.childAddress : ''),
                child_state: (!_.isEmpty(this.fv.child_information?.child_state) ? this.fv.child_information.child_state.child_state : ''),
                child_suburb: (!_.isEmpty(this.fv.child_information?.childSuburb) ? this.fv.child_information.childSuburb.childSuburb : ''),
                child_postcode: (!_.isEmpty(this.fv.child_information?.childPostcode) ? this.fv.child_information.childPostcode.childPostcode : ''),
                nappyChange: (!_.isEmpty(this.fv.child_information?.nappyChange) ? this.fv.child_information.nappyChange.nappyChange : ''),
                bottleFeed: (!_.isEmpty(this.fv.child_information?.bottleFeed) ? this.fv.child_information.bottleFeed.bottleFeed : ''),
                //
                courtorders_chk: (!_.isEmpty(this.fv.child_information?.courtAppointed) ? this.fv.child_information.courtAppointed.courtAppointed : ''),
                parent_first_name: (!_.isEmpty(this.fv.parent_guardian?.parentFirstname) ? this.fv.parent_guardian.parentFirstname.parentFirstname : ''),
                parent_middle_name: (!_.isEmpty(this.fv.parent_guardian?.parentmiddlename) ? this.fv.parent_guardian.parentmiddlename.parentmiddlename : ''),
                parent_last_name: (!_.isEmpty(this.fv.parent_guardian?.parentlastname) ? this.fv.parent_guardian.parentlastname.parentlastname : ''),
                parent_dob: (!_.isEmpty(this.fv.parent_guardian?.parentdateOfBirth) ? DateTimeHelper.getUtcDate(this.fv.parent_guardian.parentdateOfBirth.parentdateOfBirth) : ''),
                parent_email: (!_.isEmpty(this.fv.parent_guardian?.parentEmail) ? this.fv.parent_guardian.parentEmail.parentEmail : ''),
                parent_address: (!_.isEmpty(this.fv.parent_guardian?.parentAddress) ? this.fv.parent_guardian.parentAddress.parentAddress : ''),
                parent_suburb: (!_.isEmpty(this.fv.parent_guardian?.parentSuburb) ? this.fv.parent_guardian.parentSuburb.parentSuburb : ''),
                parent_country: (!_.isEmpty(this.fv.parent_guardian?.parentCountry) ? this.fv.parent_guardian.parentCountry.parentCountry : ''),
                parent_postalCode: (!_.isEmpty(this.fv.parent_guardian?.parentPC) ? this.fv.parent_guardian.parentPC.parentPC : ''),
                parent_state: (!_.isEmpty(this.fv.parent_guardian?.parentState) ? this.fv.parent_guardian.parentState.parentState : ''),
                parent_phone: (!_.isEmpty(this.fv.parent_guardian?.parentPhone) ? this.fv.parent_guardian.parentPhone.parentPhone : ''),
                parent_mobile: (!_.isEmpty(this.fv.parent_guardian?.parentMobile) ? this.fv.parent_guardian.parentMobile.parentMobile : ''),
                bookings: (!_.isEmpty(this.fv.booking_details?.preferedDate) ? this.fv.booking_details.preferedDate : []),
                allergiesArray: (!_.isEmpty(this.fv.health_information?.addAllergy) ? this.fv.health_information.addAllergy : []),
                child_circumstances: (!_.isEmpty(this.fv.child_information?.childCircumstances) ? this.fv.child_information.childCircumstances.childCircumstances : ''),
                child_aboriginal: (!_.isEmpty(this.fv.cultural_background?.straitIslande) ? this.fv.cultural_background.straitIslande.straitIslande : ''),
                cultural_background: (!_.isEmpty(this.fv.cultural_background?.culturalBackground) ? this.fv.cultural_background.culturalBackground.culturalBackground : ''),
                spoken_language: (!_.isEmpty(this.fv.cultural_background?.spokenHome) ? this.fv.cultural_background.spokenHome.spokenHome : ''),
                cultural_requirement_chk: (!_.isEmpty(this.fv.cultural_background?.culturalRequirements) ? this.fv.cultural_background.culturalRequirements.culturalRequirements : ''),
                cultural_requirement: (!_.isEmpty(this.fv.cultural_background?.culturalRequirements?.types?.cultuaral_requirements_switch) ? this.fv.cultural_background.culturalRequirements?.types?.cultuaral_requirements_switch : ''),
                religious_requirements_chk: (!_.isEmpty(this.fv.cultural_background?.religiousRequirements) ? this.fv.cultural_background.religiousRequirements.religiousRequirements : ''),
                religious_requirements: (!_.isEmpty(this.fv.cultural_background?.religiousRequirements?.types?.religious_requirements_switch) ? this.fv.cultural_background.religiousRequirements?.types?.religious_requirements_switch : ''),
                expected_start_date: (!_.isEmpty(this.fv.booking_details?.startDate) ? this.fv.booking_details.startDate.startDate : ''),
                // // mornings
                child_medical_number: (!_.isEmpty(this.fv.health_information?.medicareNumber) ? this.fv.health_information.medicareNumber.medicareNumber : ''),
                child_medicalexpiry_date: (!_.isEmpty(this.fv.health_information?.medicareExopiry) ? DateTimeHelper.getUtcDate(this.fv.health_information.medicareExopiry.medicareExopiry) : ''),
                ambulance_cover_no: (!_.isEmpty(this.fv.health_information?.ambulanceCover) ? this.fv.health_information.ambulanceCover.ambulanceCover : ''),
                child_heallth_center: (!_.isEmpty(this.fv.health_information?.healthCentre) ? this.fv.health_information.healthCentre.healthCentre : ''),
                practitioner_name: (!_.isEmpty(this.fv.health_information?.medicalService) ? this.fv.health_information.medicalService.medicalService : ''),
                practitioner_address: (!_.isEmpty(this.fv.health_information?.medicalServiceAddress) ? this.fv.health_information.medicalServiceAddress.medicalServiceAddress : ''),
                practitioner_phoneNo: (!_.isEmpty(this.fv.health_information?.medicalServicePhone) ? this.fv.health_information.medicalServicePhone.medicalServicePhone : ''),
                health_record_chk: (!_.isEmpty(this.fv.health_information?.healthRecord) ? this.fv.health_information.healthRecord.healthRecord : ''),
                immunised_chk: (!_.isEmpty(this.fv.health_information?.childImmunised) ? this.fv.health_information.childImmunised.childImmunised : ''),
                prescribed_medicine_chk: (!_.isEmpty(this.fv.health_information?.prescribedMedicine) ? this.fv.health_information.prescribedMedicine.prescribedMedicine : ''),
                detailsOfAllergies: (!_.isEmpty(this.fv.health_information?.addAllergy) ? this.fv.health_information.addAllergy : ''),
                anaphylaxis_chk: (!_.isEmpty(this.fv.health_information?.anaphylaxis) ? this.fv.health_information.anaphylaxis.anaphylaxis : ''),
                birth_certificate: (!_.isEmpty(this.fv.health_information?.birthCertificate) ? this.fv.health_information.birthCertificate.birthCertificate : ''),
                asthma_chk: (!_.isEmpty(this.fv.health_information?.asthma) ? this.fv.health_information.asthma.asthma : ''),
                other_health_conditions_chk: (!_.isEmpty(this.fv.health_information?.healthConditions) ? this.fv.health_information.healthConditions.healthConditions : ''),
                epipen_chk: (!_.isEmpty(this.fv.health_information?.epipenOrAnipen) ? this.fv.health_information.epipenOrAnipen.epipenOrAnipen : ''),
                //parent new details:
                relationship: (!_.isEmpty(this.fv.parent_guardian?.relationToChild) ? this.fv.parent_guardian.relationToChild.relationToChild : ''),
                work_address: (!_.isEmpty(this.fv.parent_guardian?.parentWorkAddress) ? this.fv.parent_guardian.parentWorkAddress.parentWorkAddress : ''),
                work_phone: (!_.isEmpty(this.fv.parent_guardian?.parentWorkPN) ? this.fv.parent_guardian.parentWorkPN.parentWorkPN : ''),
                parentWorkMob: (!_.isEmpty(this.fv.parent_guardian?.parentWorkMob) ? this.fv.parent_guardian.parentWorkMob.parentWorkMob : ''),
                work_email: (!_.isEmpty(this.fv.parent_guardian?.parentWorkEmailAddress) ? this.fv.parent_guardian.parentWorkEmailAddress.parentWorkEmailAddress : ''),
                occupation: (!_.isEmpty(this.fv.parent_guardian?.parentOccupation) ? this.fv.parent_guardian.parentOccupation.parentOccupation : ''),
                consent_incursion: (!_.isEmpty(this.fv.parent_guardian?.authorizedNominieeIncursion) ? this.fv.parent_guardian.authorizedNominieeIncursion.authorizedNominieeIncursion : ''),
                consent_make_medical_decision: (!_.isEmpty(this.fv.parent_guardian?.authNomiColectMedical) ? this.fv.parent_guardian.authNomiColectMedical.authNomiColectMedical : ''),
                consent_emergency_contact: (!_.isEmpty(this.fv.parent_guardian?.consentEmenrgencyContact) ? this.fv.parent_guardian.consentEmenrgencyContact.consentEmenrgencyContact : ''),
                consent_collect_child: (!_.isEmpty(this.fv.parent_guardian?.authorizedNominieeColect) ? this.fv.parent_guardian.authorizedNominieeColect.authorizedNominieeColect : ''),
                parent_spoken_language: (!_.isEmpty(this.fv.parent_guardian?.parentSH) ? this.fv.parent_guardian.parentSH.parentSH : ''),
                parent_cultural_background: (!_.isEmpty(this.fv.parent_guardian?.parentCB) ? this.fv.parent_guardian.parentCB.parentCB : ''),
                parent_aboriginal: (!_.isEmpty(this.fv.parent_guardian?.parentStraitIslande) ? this.fv.parent_guardian.parentStraitIslande.parentStraitIslande : ''),
                parent_crn: (!_.isEmpty(this.fv.parent_guardian?.parentprimaryCarer) ? this.fv.parent_guardian.parentprimaryCarer.parentprimaryCarer : ''),
                // carer details
                carer_relationship: (!_.isEmpty(this.fv.additional_carer_details?.relationToChild) ? this.fv.additional_carer_details.relationToChild.relationToChild : ''),
                carer_firstname: (!_.isEmpty(this.fv.additional_carer_details?.addtionalFirstname) ? this.fv.additional_carer_details.addtionalFirstname.addtionalFirstname : ''),
                carer_middlename: (!_.isEmpty(this.fv.additional_carer_details?.addtionalmiddlename) ? this.fv.additional_carer_details.addtionalmiddlename.addtionalmiddlename : ''),
                carer_lastname: (!_.isEmpty(this.fv.additional_carer_details?.addtionallastname) ? this.fv.additional_carer_details.addtionallastname.addtionallastname : ''),
                carer_dob: (!_.isEmpty(this.fv.additional_carer_details?.addtionaldateOfBirth) ? DateTimeHelper.getUtcDate(this.fv.additional_carer_details.addtionaldateOfBirth.addtionaldateOfBirth) : ''),
                carer_email: (!_.isEmpty(this.fv.additional_carer_details?.carerEmail) ? this.fv.additional_carer_details.carerEmail.carerEmail : ''),
                carer_address: (!_.isEmpty(this.fv.additional_carer_details?.addtionalAddress) ? this.fv.additional_carer_details.addtionalAddress.addtionalAddress : ''),
                carer_suburb: (!_.isEmpty(this.fv.additional_carer_details?.addtionalSuburb) ? this.fv.additional_carer_details.addtionalSuburb.addtionalSuburb : ''),
                carer_country: (!_.isEmpty(this.fv.additional_carer_details?.additionalCarerCountry) ? this.fv.additional_carer_details.additionalCarerCountry.additionalCarerCountry : ''),
                carer_postalCode: (!_.isEmpty(this.fv.additional_carer_details?.addtionalPC) ? this.fv.additional_carer_details.addtionalPC.addtionalPC : ''),
                carer_state: (!_.isEmpty(this.fv.additional_carer_details?.addtionalState) ? this.fv.additional_carer_details.addtionalState.addtionalState : ''),
                carer_phone: (!_.isEmpty(this.fv.additional_carer_details?.addtionalPhone) ? this.fv.additional_carer_details.addtionalPhone.addtionalPhone : ''),
                carer_mobile: (!_.isEmpty(this.fv.additional_carer_details?.addtionalMobile) ? this.fv.additional_carer_details.addtionalMobile.addtionalMobile : ''),
                carer_work_address: (!_.isEmpty(this.fv.additional_carer_details?.addtionalWorkAddress) ? this.fv.additional_carer_details.addtionalWorkAddress.addtionalWorkAddress : ''),
                carer_work_phone: (!_.isEmpty(this.fv.additional_carer_details?.addtionalWorkPN) ? this.fv.additional_carer_details.addtionalWorkPN.addtionalWorkPN : ''),
                carer_work_mob: (!_.isEmpty(this.fv.additional_carer_details?.addtionalWorkMN) ? this.fv.additional_carer_details.addtionalWorkMN.addtionalWorkMN : ''),
                carer_work_email: (!_.isEmpty(this.fv.additional_carer_details?.addtionalWorkEmailAddress) ? this.fv.additional_carer_details.addtionalWorkEmailAddress.addtionalWorkEmailAddress : ''),
                carer_occupation: (!_.isEmpty(this.fv.additional_carer_details?.addtionalOccupation) ? this.fv.additional_carer_details.addtionalOccupation.addtionalOccupation : ''),
                carer_consent_incursion: (!_.isEmpty(this.fv.additional_carer_details?.AdiAuthNominieeIncursion) ? this.fv.additional_carer_details.AdiAuthNominieeIncursion?.AdiAuthNominieeIncursion : ''),
                care_consent_mak_medi_deci: (!_.isEmpty(this.fv.additional_carer_details?.addiAuthNomiColMedi) ? this.fv.additional_carer_details.addiAuthNomiColMedi.addiAuthNomiColMedi : ''),
                care_consent_eme_contact: (!_.isEmpty(this.fv.additional_carer_details?.AddiConsentEmenrgencyContact) ? this.fv.additional_carer_details.AddiConsentEmenrgencyContact.AddiConsentEmenrgencyContact : ''),
                carer_consent_collect_child: (!_.isEmpty(this.fv.additional_carer_details?.AddiAuthorizedNominieeColect) ? this.fv.additional_carer_details.AddiAuthorizedNominieeColect.AddiAuthorizedNominieeColect : ''),
                carer_spoken_language: (!_.isEmpty(this.fv.additional_carer_details?.addtionalSH) ? this.fv.additional_carer_details.addtionalSH.addtionalSH : ''),
                carer_cultural_background: (!_.isEmpty(this.fv.additional_carer_details?.addtionalCB) ? this.fv.additional_carer_details.addtionalCB.addtionalCB : ''),
                carer_aboriginal: (!_.isEmpty(this.fv.additional_carer_details?.addtionalStraitIslande) ? this.fv.additional_carer_details.addtionalStraitIslande.addtionalStraitIslande : ''),
                addition_carer_crn: (!_.isEmpty(this.fv.additional_carer_details?.addtionalprimaryCarer) ? this.fv.additional_carer_details.addtionalprimaryCarer.addtionalprimaryCarer : ''),

                emergency: this.getEmergencyArrayFinal(),
                //
                // //additional consents
                consent1: (!_.isEmpty(this.fv.consents?.consent1) ? this.fv.consents.consent1.consent1 : ''),
                consent2: (!_.isEmpty(this.fv.consents?.consent2) ? this.fv.consents.consent2.consent2 : ''),
                consent3: (!_.isEmpty(this.fv.consents?.consent3) ? this.fv.consents.consent3.consent3 : ''),
                consent4: (!_.isEmpty(this.fv.consents?.consent4) ? this.fv.consents.consent4.consent4 : ''),
                consent5: (!_.isEmpty(this.fv.consents?.consent5) ? this.fv.consents.consent5.consent5 : ''),
                consent6: (!_.isEmpty(this.fv.consents?.consent6) ? this.fv.consents.consent6.consent6 : ''),
                consent7: (!_.isEmpty(this.fv.consents?.consent7) ? this.fv.consents.consent7.consent7 : ''),
                consent8: (!_.isEmpty(this.fv.consents?.consent8) ? this.fv.consents.consent8.consent8 : ''),
                new_inputs: allInputsCollection,
                upload_files: this.uploadFileMap
            }

        // console.log(sendData)
        // return "";

        this.buttonLoader = true;

        this._enrollmentService.enrollChildMasterData(sendData)
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe((response: any) => {

                if (!response.code) {
                    return;
                }

                if (response.data && response.data !== '') {
                    window.parent.location.href = response.data;
                } else {
                    this.isSubmitted = true;
                }

                if (response.code === '200') {
                    setTimeout(() => this._notification.displaySnackBar('success', NotifyType.SUCCESS), 200);
                }
                this._notification.clearSnackBar();

                setTimeout(() => {
                    if (this.scrollDirective) {
                        this.scrollDirective.scrollToTop();
                    }
                }, 300);
            });
    }

    getEmergencyArrayFinal(): any {

        const fieled = {};
        /*mandatory emergency default*/
        _.find(this.sections, {section_code: 'emergency_contact_details'})['inputs'].forEach((input, key) => {
            const adjust = [];
            for (const i of this.checkBoxes) {
                if (input.input_name + '_em_0' === i.name) {
                    adjust.push(i.value);
                }
            }
            fieled[input['input_name']] = ((this.fv.emergency_contact_details?.[input.input_name]?.[input.input_name] !== undefined) ? (input.input_type === 'checkbox' && adjust.length > 0) ? adjust : this.fv.emergency_contact_details?.[input.input_name]?.[input.input_name] : '')
        })
        // console.log([fieled, ...(this.fv.emergency_contact_details?.addEmergencyContact !== undefined) ? this.fv.emergency_contact_details.addEmergencyContact : []])
        return [fieled, ...(this.fv.emergency_contact_details?.addEmergencyContact !== undefined) ? this.fv.emergency_contact_details.addEmergencyContact : []]
    }

    getAllergyTypes(branchId: string): void {

        this._enrollmentService
            .getAllergyTypes(branchId)
            .subscribe(
                (response) => {
                    this.allergyTypes = response.allergyTypes;
                }
            );

    }

    handleUploadChange(data: { fileList: FileListItem[], inputName: string }): void {
        this.uploadFileMap[data.inputName] = _.map(data.fileList, 'key');
    }

    checkedFieldsGet(data: { event: boolean, name: string, value: string, sectionCode: string }): void {
        if (data.event) {
            this.checkBoxes.push({
                name: data.name,
                value: data.value,
                section: data.sectionCode
            });
            this.enrollmentForm.get(data.sectionCode + '.' + data.name + '.' + data.name).patchValue(true, {emitEvent: false});
        } else {
            this.checkBoxes.splice(this.checkBoxes.indexOf(data.value), 1);
        }
    }

    checkedAttendanceMarked(data: { value: boolean }): void {
        this.validForAttendance = (this.attendanceMandatory) ? data.value : true
    }

    checkedUploadsValidate(data: { name: string, value: boolean }): void {
        /*mandatory uploads completeness check*/
        if (Object.keys(this.uploadSwitchInputs).length > 0) {
            Object.values(this.uploadSwitchInputs).forEach(x => {
                if (x.name === data.name && Object.keys(this.uploadFileMap).length > 0 && this.uploadFileMap[x.name] !== undefined && Object.values(this.uploadFileMap[x.name]).length > 0) {
                    this.checkedUploading[x.name] = true;
                } else if ((!x.required || !data.value) && x.name === data.name) {
                    this.checkedUploading[x.name] = null;
                } else if (data.value && x.required && x.name === data.name) {
                    this.checkedUploading[x.name] = false;
                    this.uploadFileMap[data.name] = []
                }
            })
        }
        this.validateUploads = Object.values(this.checkedUploading).indexOf(false) > -1 ? false : true;
    }

    trackField(id: string): void {
        const el = document.getElementById(id);
        document.getElementById(id).style.backgroundColor = '#FFF2F0';
        setTimeout(() => document.getElementById(id).style.backgroundColor = 'white', 4000);
        el.scrollIntoView();
    }

    checkedSignatures(data: { name: string, required: boolean, section: string, value: string }): void {
        this.signatureTemp = data;
        this.signaturesList.forEach((x, keyy) => {
            const key = !_.isEmpty(this.signatureTemp[x.section]) && this.signatureTemp[x.section] !== undefined ? this.signatureTemp[x.section].findIndex(y => y.name === x.name) : -2;
            if (key > -1) {
                this.signaturesList[keyy]['value'] = _.isEmpty(this.signatureTemp[x.section][key]) ? '' : this.signatureTemp[x.section][key]['value'];
                this.enrollmentForm.get(this.signatureTemp[x.section][key]['section'] + '.' + this.signatureTemp[x.section][key]['name'] + '.' + this.signatureTemp[x.section][key]['name']).patchValue(this.signaturesList[keyy]['value'], {emitEvent: false});
            }
        })
    }
}

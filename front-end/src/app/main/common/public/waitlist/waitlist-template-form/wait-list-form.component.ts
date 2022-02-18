import {
    Component,
    OnInit,
    ViewEncapsulation,
    OnDestroy,
    ViewChild,
    AfterViewInit,
} from '@angular/core';
import {
    FormGroup,
    Validators,
    FormBuilder,
    FormControl,
    FormArray,
    ValidationErrors
} from '@angular/forms';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {animate, keyframes, state, style, transition, trigger} from '@angular/animations';
import {fuseAnimations} from '@fuse/animations';
import {ReCaptcha2Component} from 'ngx-captcha';
import {helpMotion} from 'ng-zorro-antd';
import * as _ from 'lodash';
import {AppConst} from 'app/shared/AppConst';
import {NotificationService} from 'app/shared/service/notification.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {ActivatedRoute} from '@angular/router';
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
import {EmailAttachmentService} from '../services/email-attachment.service';
import {FileListItem} from 'app/shared/components/s3-upload/s3-upload.model';
import {YesValidator} from 'app/shared/validators/yes-validator';


@Component({
    selector: 'app-wait-list-form',
    templateUrl: './wait-list-form.component.html',
    styleUrls: ['./wait-list-form.component.scss'],
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
export class WaitListFormComponent implements OnInit, OnDestroy, AfterViewInit {
    panelOpenState = false;
    waitlist: Waitlist;

    unsubscribeAll: Subject<any>;

    public sections: any[]
    // Form
    private waitlistForm: FormGroup; // Enrollment Form
    private _unsubscribeAll: Subject<any>;
    unsubcribe: any
    bookings: FormArray;
    emergencyContacts: FormArray;
    filtersLoaded: Promise<boolean>;
    currentYear: number;
    recaptchaSiteKey: string;
    isSubmitted: boolean;
    userExist: boolean;
    aboriginals: string[];
    registrationMode: boolean;
    time: string[];
    emergency: string[];
    countriesList: Country[] = []; // Country Select
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
    @ViewChild('captchaElem') recaptchaComponent: ReCaptcha2Component;
    _modalService: any;
    validForAttendance: boolean = false
    validateUploads: boolean = true
    uploadSwitchInputs: object = [];
    checkedUploading: boolean[] = [];
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
        private _waitListService: EnrollmentsService,
        private _notification: NotificationService,
        private _route: ActivatedRoute,
        private _commonService: CommonService,
        private _dialogService: MatDialog,
        private _auth: AuthService,
        private _sectionService: SectionService,
        private _emailAttachmentService: EmailAttachmentService,
    ) {
        this.uploadFileMap = {};
        this.branchDetails = this._auth.getClient();
        this.currentYear = new Date().getFullYear();
        this.recaptchaSiteKey = AppConst.appKeys.recaptchaKey;
        this.buttonLoader = false;
        this.isSubmitted = false;
        this.userExist = false;
        this.sections = [];
        this.branchSelect = new FormControl(null);
        this.unsubscribeAll = new Subject();
        this.formLoading = false;
        this.branches = [];
        this.siteManagerMode = this._auth._domain === AppConst.appStart.ENROLLMENT.NAME ? true : false;
        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.dynamicMode = false;
        this.invalidAccess = false;
        this.addcarer = false;
        this.attendanceFormStatus = '';
        this.datainfo = this._route.snapshot.data['resolveData'];
        this.attendanceList = this._commonService.getWeekDays();
        this.branchLogo = '';
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

        this.branchDetails = this._route.snapshot.data['sectionsSet']['branchData'];
        if (!this.siteManagerMode) {
            this.orgName = this.branchDetails.org_name;
            this.branchName = this.branchDetails.name;
            this.branchLogo = (this.branchDetails.branch_logo) ? this._commonService.getS3FullLink(this.branchDetails.branch_logo) : '';
        }

        this.branchSelect
            .valueChanges
            .pipe(
                takeUntil(this.unsubscribeAll),
                switchMap((branchId: string) => {
                    this.branchDetails = _.find(this.branches, {id: branchId});
                    this.orgName = this.branchDetails.org_name;
                    this.branchName = this.branchDetails.name;
                    this.branchLogo = (this.branchDetails.branchLogo) ? this._commonService.getS3FullLink(this.branchDetails.branchLogo) : '';
                    return this._sectionService.enrolmentDynamicFields(branchId, AppConst.appStart.WAITLIST.NAME);
                })
            )
            .subscribe((value) => {

                if (value.data) {
                    this.sections = value.data;
                    this._setSectionElementsData();
                }

            });
        this._setScrollDirective();
    }

    _setSectionElementsData(): void {
        this.waitlistForm = new FormGroup({
            recaptcha: new FormControl('', Validators.required),
        });
        this.sections.forEach(g => {
            this.waitlistForm.addControl(g.section_code, new FormGroup({})) // section_code group create
            const section = this.waitlistForm.get(g.section_code) as FormGroup; // get section_code group to section constance
            g.inputs.forEach(x => {
                // from enquiry added  fields answers getting
                let newFieldAnswer: any;
                if (this.datainfo?.waitlist_info?.new_inputs !== undefined) {
                    let key = this.datainfo.waitlist_info.new_inputs.find(item => item.name === x.input_name);
                    if (key !== undefined) {
                        newFieldAnswer = key.values;
                    }
                }

                if ('attendance' == x.input_name) {
                    this.attendanceMandatory = (x.input_mandatory)
                    this.validForAttendance = (this.attendanceMandatory) ? false : true
                    section.addControl(x.input_name, this._formBuilder.array([this.addAttendanceCheckbox()]))
                } else if ('child_bornOrNot' == x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl(false, null),
                    }))
                } else if ('checkbox' == x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : false, (x.input_mandatory) ? YesValidator.YesOnly : null),
                    }))
                } else if ('select-multiple' == x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : [], (x.input_mandatory) ? [Validators.required] : null),
                    }))
                } else if ('email' == x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.email, Validators.maxLength(150)] : [Validators.email, Validators.maxLength(150)]),
                    }))
                } else if ('text-area' == x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.maxLength(250)] : Validators.maxLength(250)),
                    }))
                } else if ('crn' == x.input_name || 'parentprimaryCarer' == x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')] : [Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')]),
                    }))
                } else if ('addtionalPCR' == x.input_name || 'parentPC' == x.input_name || 'medicalServicePhone' == x.input_name || 'parentPhone' == x.input_name || 'parentWorkPN' == x.input_name || 'addtionalPhone' == x.input_name || 'addtionalWorkPN' == x.input_name || 'emenrgencyPhone' == x.input_name || 'parentMobile' == x.input_name || 'addtionalMobile' == x.input_name || 'parentWorkPN' == x.input_name || 'parentWorkMob' == x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)] : [Validators.maxLength(10), Validators.pattern(/^[0-9]\d*$/)]),
                    }))
                } else if ('firstname' == x.input_name || 'middlename' == x.input_name || 'lastname' == x.input_name || 'parentFirstname' == x.input_name || 'parentmiddlename' == x.input_name || 'parentlastname' == x.input_name || 'addtionalFirstname' == x.input_name || 'addtionalmiddlename' == x.input_name || 'addtionallastname' == x.input_name || 'emenrgencyFirtsName' == x.input_name || 'emenrgencylastName' == x.input_name) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-Z  0-9_)(-]+$')] : [Validators.maxLength(150), Validators.pattern('^[a-zA-Z  0-9_)(-]+$')]),
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
                        [x.input_name]: new FormControl((newFieldAnswer) ? newFieldAnswer : '', (x.input_mandatory) ? [('switch' === x.input_type || 'upload-switch' === x.input_type) ? YesValidator.YesOnly : Validators.required, Validators.maxLength(250)] : Validators.maxLength(150)),
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
        // console.log('this.datainfo.waitlist_info')
        // console.log(this.datainfo.waitlist_info)
        this.waitlistForm.get('parent_guardian.parentFirstname.parentFirstname').patchValue(this.datainfo.waitlist_info.firstname, {emitEvent: false});
        this.waitlistForm.get('parent_guardian.parentlastname.parentlastname').patchValue(this.datainfo.waitlist_info.lastname, {emitEvent: false});
        this.waitlistForm.get('parent_guardian.parentEmail.parentEmail').patchValue(this.datainfo.waitlist_info.email, {emitEvent: false});

        if (this.fv.parent_guardian?.childAge?.childAge !== undefined) {
            this.waitlistForm.get('parent_guardian.childAge.childAge').patchValue(this.datainfo.waitlist_info.age, {emitEvent: false});
        }
        if (this.fv.parent_guardian?.parentMobile?.parentMobile !== undefined) {
            this.waitlistForm.get('parent_guardian.parentMobile.parentMobile').patchValue(this.datainfo.waitlist_info.mobile, {emitEvent: false});
        }

    }

    /**
     * add attendance to form array
     */

    addAttendanceCheckbox(): FormGroup {
        return this._formBuilder.group({
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
                this._setSectionElementsData();
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
        return this.waitlistForm.controls;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fv(): any {
        return this.waitlistForm.value
    }

    public findInvalidControls(): void {
        const invalid = [];
        const controls = this.waitlistForm.controls;
        for (const name in controls) {
            if (controls[name].invalid) {
                invalid.push(name);
            }
        }
        // console.log(invalid)
        // return invalid;
    }

    onFormSubmit(e: MouseEvent): void {
        e.preventDefault();
        // this.findInvalidControls();
        // this.pdfAttachmentForParent();
        if (this.waitlistForm.invalid || !this.validForAttendance || !this.validateUploads) {
            this.showInvalidInputs()
            return;
        }
        this.buttonLoader = true;
        const formValues = this.waitlistForm.value;
        delete formValues['recaptcha'];
        const allInputsCollection = [];

        const path = AppConst.appStart.WAITLIST.NAME;
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

        for (const val in formValues) {
            const sectionStore = [];
            for (const newInput of this.allInputs) {/*index name with  get relevant  new inputs*/
                if (formValues[val][newInput]) {

                    let answer = {};
                    if (newInput === 'attendance') {
                        answer = {
                            values: this.getAttendance(),
                            name: newInput
                        }
                    } else {
                        answer = {
                            values: (tot[newInput].length > 0) ? tot[newInput] : formValues[val][newInput][newInput],
                            name: newInput
                        }
                    }

                    sectionStore.push(answer)

                    if (newInput === 'child_bornOrNot' && !this.fv.child_information.child_bornOrNot.child_bornOrNot) {
                        sectionStore.push({
                            values: '',
                            name: 'dateOfBirth'
                        }, {
                            values: '',
                            name: 'childGender'
                        })
                    }


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
        const staticCollectionn = JSON.stringify(allInputsCollection);
        this._emailAttachmentService.convertToPDF(this.sections, this.fv, tot, path).then(url => {

            const sendData =
                {
                    org_id: this.branchDetails.org ? this.branchDetails.org : this.branchDetails.orgId,
                    branch_id: this.branchDetails.id,
                    enquiry_id: this.datainfo?.id !== undefined ? this.datainfo.id : null,
                    form: AppConst.appStart.WAITLIST.NAME,

                    /*child details*/
                    childborn: (!_.isEmpty(this.fv.child_information?.child_bornOrNot) ? this.fv.child_information.child_bornOrNot.child_bornOrNot : ''),
                    firstname: (!_.isEmpty(this.fv.child_information?.firstname) ? this.fv.child_information.firstname.firstname : ''),
                    middlename: (!_.isEmpty(this.fv.child_information?.middlename) ? this.fv.child_information.middlename.middlename : ''),
                    lastname: (!_.isEmpty(this.fv.child_information?.lastname) ? this.fv.child_information.lastname.lastname : ''),
                    date_of_birth: (!_.isEmpty(this.fv.child_information?.dateOfBirth) ? DateTimeHelper.getUtcDate(this.fv.child_information.dateOfBirth.dateOfBirth) : ''),
                    crn: (!_.isEmpty(this.fv.child_information?.crn) ? this.fv.child_information.crn.crn : ''),
                    gender: (!_.isEmpty(this.fv.child_information?.childGender) ? this.fv.child_information.childGender.childGender : ''),
                    sibilings: (!_.isEmpty(this.fv.child_information?.siblingAttend) ? this.fv.child_information.siblingAttend.siblingAttend : ''),
                    enrolment_date: (!_.isEmpty(this.fv.child_information?.startDate) ? DateTimeHelper.getUtcDate(this.fv.child_information.startDate.startDate) : ''),
                    priority: (!_.isEmpty(this.fv.child_information?.priority) ? this.fv.child_information.priority.priority : ''),
                    attendance: this.getAttendance(),

                    //parent details:
                    parentfirstname: (!_.isEmpty(this.fv.parent_guardian?.parentFirstname) ? this.fv.parent_guardian.parentFirstname.parentFirstname : ''),
                    parentmiddlename: (!_.isEmpty(this.fv.parent_guardian?.parentmiddlename) ? this.fv.parent_guardian.parentmiddlename.parentmiddlename : ''),
                    parentlastname: (!_.isEmpty(this.fv.parent_guardian?.parentlastname) ? this.fv.parent_guardian.parentlastname.parentlastname : ''),
                    parent_date_of_birth: (!_.isEmpty(this.fv.parent_guardian?.parentdateOfBirth) ? DateTimeHelper.getUtcDate(this.fv.parent_guardian.parentdateOfBirth.parentdateOfBirth) : ''),
                    email: (!_.isEmpty(this.fv.parent_guardian?.parentEmail) ? this.fv.parent_guardian.parentEmail.parentEmail : ''),
                    address: (!_.isEmpty(this.fv.parent_guardian?.parentAddress) ? this.fv.parent_guardian.parentAddress.parentAddress : ''),
                    suburb: (!_.isEmpty(this.fv.parent_guardian?.parentSuburb) ? this.fv.parent_guardian.parentSuburb.parentSuburb : ''),
                    country: (!_.isEmpty(this.fv.parent_guardian?.parentCountry) ? this.fv.parent_guardian.parentCountry.parentCountry : ''),
                    postalCode: (!_.isEmpty(this.fv.parent_guardian?.parentPC) ? this.fv.parent_guardian.parentPC.parentPC : ''),
                    state: (!_.isEmpty(this.fv.parent_guardian?.parentState) ? this.fv.parent_guardian.parentState.parentState : ''),
                    phone: (!_.isEmpty(this.fv.parent_guardian?.parentPhone) ? this.fv.parent_guardian.parentPhone.parentPhone : ''),
                    mobile: (!_.isEmpty(this.fv.parent_guardian?.parentMobile) ? this.fv.parent_guardian.parentMobile.parentMobile : ''),
                    parentWorkMob: (!_.isEmpty(this.fv.parent_guardian?.parentWorkMob) ? this.fv.parent_guardian.parentWorkMob.parentWorkMob : ''),
                    parentWorkPN: (!_.isEmpty(this.fv.parent_guardian?.parentWorkPN) ? this.fv.parent_guardian.parentWorkPN.parentWorkPN : ''),
                    parentcrn: (!_.isEmpty(this.fv.parent_guardian?.parentprimaryCarer) ? this.fv.parent_guardian.parentprimaryCarer.parentprimaryCarer : ''),
                    hearAbout: (!_.isEmpty(this.fv.parent_guardian?.hearAbout) ? this.fv.parent_guardian.hearAbout.hearAbout : ''),

                    new_inputs: JSON.parse(staticCollectionn),
                    upload_files: this.uploadFileMap,
                    attachmentUrl: this._commonService.getS3FullLink(path + '/' + url)
                }


//             console.log('sendData');
//             console.log(sendData);
// return ;

            this._waitListService.storeWaitListChild(sendData)
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
                })
        });


    }

    getAttendance(): void {
        return ((this.fv.child_information?.attendance !== undefined) ? this.fv.child_information.attendance[0] : {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            allDays: false,
        });
    }

    handleUploadChange(data: { fileList: FileListItem[], inputName: string }): void {
        this.uploadFileMap[data.inputName] = _.map(data.fileList, 'key');
    }

    checkedFieldsGet(data: { event: boolean, name: string, value: string, sectionCode: string }): void {
        if (data.event) {
            this.checkBoxes.push({
                name: data.name,
                value: data.value
            });
            this.waitlistForm.get(data.sectionCode + '.' + data.name + '.' + data.name).patchValue(true, {emitEvent: false});
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

    showInvalidInputs(): void {
        this.invalids = [];
        this.staggeringInvalids = [];
        this.next = 0;
        Object.keys(this.waitlistForm.controls).forEach(key => {

                if (this.waitlistForm.controls[key]['controls']) {

                    Object.keys(this.waitlistForm.controls[key]['controls']).forEach(key2 => {
                        if (this.waitlistForm.controls[key]['controls'][key2]) {
                            if (Object.keys(this.waitlistForm.controls[key]['controls'][key2]['controls']).length > 0) {
                                Object.keys(this.waitlistForm.controls[key]['controls'][key2]['controls']).forEach(key4 => {
                                    if (this.waitlistForm.controls[key]['controls'][key2].get(key4).errors) {
                                        const controlErrors: ValidationErrors = this.waitlistForm.controls[key]['controls'][key2].get(key4).errors;
                                        if (controlErrors != null) {
                                            Object.keys(controlErrors).forEach(keyError => {
                                                let question = (this.inputWithQuestion[this.inputWithQuestion.findIndex(x => x.name === key4)]['question']).replace(/<\/?[^>]+(>|$)/g, '');
                                                question = question.length > 20 ? question.substr(0, 20) + '...' : question;

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
                                                this.invalids.push({text: text, id: key4})
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
            this.invalids.push({text: 'preferred days are required!`', id: 'attendance'})
        }

        /*file uploads*/
        if (!this.validateUploads) {
            this.invalids.push({text: 'file upload required for respective fields!`', id: 'waitlist'})
        }

        if (this.invalids.length === 0 && this.waitlistForm.invalid) {
            this.invalids.push({
                text: 'You need tik on Recaptcha!`',
                id: 'waitlist'
            })
        }

        // console.log(this.invalids)
        // console.log(this.staggeringInvalids)
        this.doNext();
    }

    doNext(): void {
        if (this.next < this.invalids.length) {
            this.staggeringInvalids.push(this.invalids[this.next++]);
        }
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
                this.waitlistForm.get(this.signatureTemp[x.section][key]['section'] + '.' + this.signatureTemp[x.section][key]['name'] + '.' + this.signatureTemp[x.section][key]['name']).patchValue(this.signaturesList[keyy]['value'], {emitEvent: false});
            }
        })
    }
}



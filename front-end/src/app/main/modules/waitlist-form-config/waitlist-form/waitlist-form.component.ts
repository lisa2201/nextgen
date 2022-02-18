import {
    Component,
    OnInit,
    ViewEncapsulation,
    AfterViewInit,
} from '@angular/core';
import {FormGroup, Validators, FormBuilder, FormControl, FormArray, ReactiveFormsModule} from '@angular/forms';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {fuseAnimations} from '@fuse/animations';
import {helpMotion} from 'ng-zorro-antd';
import * as _ from 'lodash';
import {AppConst} from 'app/shared/AppConst';
import {NotificationService} from 'app/shared/service/notification.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {Router, ActivatedRoute} from '@angular/router';
import {Country} from 'app/shared/model/common.interface';
import {CommonService} from 'app/shared/service/common.service';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {MatDialog} from '@angular/material/dialog';
import {DeclarationDialogComponent} from '../declaration-dialog/declaration-dialog.component';
import {Waitlist} from '../models/waitlist.model';
import {EnrollmentsService} from '../services/enrollments.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {AuthService} from 'app/shared/service/auth.service';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {SectionService} from '../services/section.service';
import {InputAddComponent} from '../sections/input-add/input-add.component';
import {FuseSidebarService} from '@fuse/components/sidebar/sidebar.service';
import {PreviewWaitlistFormComponent} from '../preview-form/waitlist/preview-form.component';

@Component({
    selector: 'app-waitlist-form',
    templateUrl: './waitlist-form.component.html',
    styleUrls: ['./waitlist-form.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class WaitlistFormComponent implements OnInit, AfterViewInit {
    panelOpenState = false;
    waitlist: Waitlist;
    public sections: any[]
    public selectedSection: [];
    // Form
    public waitlistForm: FormGroup; // Enrollment Form
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
    newInput: any[];
    settingsMaster: string;
    datainfo: any;
    addcarer: boolean;
    dynamicMode: boolean;
    invalidAccess: boolean;
    attendanceList: any;
    allChecked: boolean;
    indeterminate: boolean;
    attendanceFormStatus: string;
    dialogRef: any;
    incrementInput: number;
    newbooking: any[] = [{
        address: ''
    }];
    branchDetails: any;
    previewButtonLoader: boolean;
    // common
    buttonLoader: boolean;
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive
    loadingActiveAddNew: boolean = false;
    loadingActivePreview: boolean = false;
    loadingActiveSave: boolean = false;
    lastUpdated: Date
    saveButtonActive: boolean = false;

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
        private _matDialog: MatDialog,
        private _fuseSidebarService: FuseSidebarService,
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
        // this.sections = this._route.snapshot.data['sectionsSet']['data'];
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
        this.settingsMaster = 'waitlist';
        this.allergiesList = [
            'Anaphylaxis',
            'Allergy',
            'Asthma',
            'Diabetes',
            'Special dietary requirements',
            'Sunscreen requirements',
            'Other'
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
        this.incrementInput = 0;
        this.previewButtonLoader = false;
        // this.listAdded = new EventEmitter();
        this._sectionService.storeSections(this._route.snapshot.data['enrolmentSet']['data']);
        this.lastUpdated = new Date();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     *  On Init
     */
    ngOnInit(): void {
        this._enrollmentService.refreshNeed.subscribe(() => {
            this.getAllSectionsRefreshed()
        })
        this.getAllSections()
        this._enrollmentService.getSaveButtonActivate().subscribe(value => {
            this.saveButtonActive = value;
        })
    }

    private getAllSectionsRefreshed(): void {
        // @ts-ignore
        this._sectionService.enrolmentDynamicFields(this.settingsMaster)
            .subscribe(
                sections => {
                    this.sections = sections['data'];
                    this._setSectionElementsData();
                    this.loadUpdatedSection();
                })
    }

    private loadUpdatedSection(): void {
        const t = this.sections.findIndex(x => x.id === this.selectedSection['id']);
        if (t === -1) {
            this.selectedSection = this.sections[this.sections.length - 1];
        } else {
            this.selectedSection = this.sections[this.sections.findIndex(x => x.id === this.selectedSection['id'])];
        }
    }

    private getAllSections(): void {
        this._setInitData();
        this._setSectionElementsData();
    }

    private _setSectionElementsData(): void {
        this.waitlistForm = new FormGroup({
            agreement: new FormControl(true, Validators.requiredTrue),
            // recaptcha: new FormControl('', Validators.required),
            recaptcha: new FormControl('xx'),
        });
        const dates = [];
        this.sections.forEach(g => {
            dates.push(new Date(g.section_latest_updated_at))
            this.waitlistForm.addControl(g.section_code, new FormGroup({})) // section_code group create
            const section = this.waitlistForm.get(g.section_code) as FormGroup; // get section_code group to section constance
            g.inputs.forEach(x => {
                section.addControl(x.input_name, new FormGroup({
                    [x.input_hiddenfield_name]: new FormControl(x.hidden),
                    [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                    [x.input_required]: new FormControl(x.input_mandatory),
                    [x.input_name]: new FormControl(''),
                    ['order']: new FormControl(x.column_order),
                })),
                    section.addControl('section_settings', new FormGroup({
                        ['mandatory']: new FormControl(g.mandatory),
                        ['section_position_static']: new FormControl(g.section_position_static),
                        ['section_order']: new FormControl(g.section_order),
                        ['section_hide']: new FormControl(g.section_hide),
                        ['section_name']: new FormControl(g.title),
                        [g.section_code + '_hide']: new FormControl(g.section_hide),
                    }))
            })
        })
        // this.filtersLoaded = Promise.resolve(true);
        this.lastUpdated = new Date(Math.max.apply(null, dates));
    }

    addNewInputDialog(e: MouseEvent): void {
        e.preventDefault();

        // setTimeout(() => this._fuseSidebarService.getSidebar('children-list-filter-sidebar').close(), 250);

        this.buttonLoader = true;

        setTimeout(() => this.buttonLoader = false, 200);

        this.dialogRef = this._matDialog
            .open(InputAddComponent,
                {
                    panelClass: 'enrolment-new-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        section: this.selectedSection,
                        settingsMaster: this.settingsMaster,
                    }
                });

        // this.dialogRef
        //     .afterClosed()
        //     .pipe(takeUntil(this._unsubscribeAll))
        //     .subscribe(message =>
        //     {
        //         if ( !message )
        //         {
        //             return;
        //         }
        //
        //         this._notification.clearSnackBar();
        //
        //         setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
        //     });
    }

    receiveSection($event): void {
        this.selectedSection = $event
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
        // this.newInput = this.inputAdd.newOne;
        // this.incrementInput++;
        // // this.selectedSection.push(
        // //     {
        // //         'DynamicName_'+this.incrementInput:'1';
        // //     }
        // // )
        //
        // console.log('xxxx')
        // console.log(this.newInput)
    }

    /**
     * On Destroy
     */
    ngOnDestroy(): void {
        // Close all dialogs
        this._matDialog.closeAll();
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
        const resolveData = this._route.snapshot.data['countryList'];

        if (!_.isEmpty(resolveData)) {
            this.countriesList = resolveData[0];
        }
        const resolverSections = this._route.snapshot.data['sectionsSet'];
        if (!_.isEmpty(resolverSections)) {
            this.sections = resolverSections['data'];
        }

    }


    addBookingGroup(): FormGroup {

        return this._formBuilder.group({
            mornings: [''],
            monday: [false],
            tuesday: [false],
            wednedday: [false],
            thursday: [false],
            friday: [false],
            saturday: [false],
            sunday: [false]

        });
    }

    get bookingArray() {
        return this.waitlistForm.get('bookings') as FormArray;
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
        return this.waitlistForm.get('allergiesArray') as FormArray;
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
            ec_phone: ['', Validators.required],
            ec_email: ['', Validators.required],
            // emergencyType: [null, Validators.required],
            ec_relationship: [''],
            ec_consent_incursion: [false],
            ec_consent_make_medical_decision: [false],
            ec_consent_emergency_contact: [false],
            ec_consent_collect_child: [false],
        })
    }

    get emergencyContactsArray() {
        return this.waitlistForm.get('emergencyContacts') as FormArray;
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

    removeCarer(): void {
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
        return this.waitlistForm.controls;
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */

    onFormSubmit(e: MouseEvent): void {
        if (this.waitlistForm.invalid) {
            return;
        }

        this.loadingActiveSave = true;
        const sendData =
            {
                'form': this.settingsMaster,
                'form_data': this.waitlistForm.value,
            }

        this._enrollmentService.enrollChildMasterData(sendData)
            .pipe()
            .subscribe((code: string) => {
                // console.log(code + 'x')
                if (!code) {
                    this.loadingActiveSave = false;
                    return;
                }
                // console.log(code + 'y')
                if (code === '200') {
                    // console.log(code)
                    // console.log(code + 'z')
                    setTimeout(() => this._notification.displaySnackBar('success', NotifyType.SUCCESS), 200);

                }
                this._notification.clearSnackBar();
                setTimeout(() => this._notification.displaySnackBar('Successfully updated.', NotifyType.SUCCESS), 200);

                this.loadingActiveSave = false;
                setTimeout(() => {
                    this.isSubmitted = true;
                    this._enrollmentService.setSaveButtonActivate(false);
                    if (this.scrollDirective) {
                        this.scrollDirective.scrollToTop();
                    }
                }, 300);
            });
    }

    previewWaitlist(e): void {
        e.preventDefault();
        this.previewButtonLoader = true;
        setTimeout(() => {
                this.dialogRef = this._matDialog
                    .open(PreviewWaitlistFormComponent,
                        {
                            panelClass: 'preview-waitlist-form',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                response: {},
                                sections: this.sections,
                                settingsMaster: this.settingsMaster,
                            }
                        }).afterOpened();
                this.previewButtonLoader = false;
            }
            , 200);
    }

    loadingStop() {
        this.previewButtonLoader = false
    }
}

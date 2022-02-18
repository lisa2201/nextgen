import {
    Component,
    OnInit,
    ViewEncapsulation,
    OnDestroy,
    ViewChild,
    AfterViewInit,
    Inject,
} from '@angular/core';
import {FormGroup, Validators, FormBuilder, FormControl, FormArray} from '@angular/forms';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {fuseAnimations} from '@fuse/animations';
import {ReCaptcha2Component} from 'ngx-captcha';
import {helpMotion} from 'ng-zorro-antd';
import {Country} from 'app/shared/model/common.interface';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {Subject} from 'rxjs';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {Branch} from 'app/main/modules/branch/branch.model';


@Component({
    selector: 'preview-waitlist-form',
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
export class PreviewWaitlistFormComponent implements OnInit, OnDestroy, AfterViewInit {
    panelOpenState = false;
    waitlist: any;

    unsubscribeAll: Subject<any>;

    public sections: any[]
    // Form
    public waitlistForm: FormGroup; // Enrollment Form
    private _unsubscribeAll: Subject<any>;
    unsubcribe: any
    bookings: FormArray;
    emergencyContacts: FormArray;
    filtersLoaded: Promise<boolean>;
    currentYear: number;
    isSubmitted: boolean;
    userExist: boolean;
    aboriginals: string[];
    registrationMode: boolean;
    time: string[];
    emergency: string[];
    countriesList: Country[] = []; // Country Select
    newInputs: any[] = [];
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
        @Inject(MAT_DIALOG_DATA) public data: any,
        public matDialogRef: MatDialogRef<PreviewWaitlistFormComponent>,
    ) {
        this.uploadFileMap = {};
        this.currentYear = new Date().getFullYear();
        this.buttonLoader = false;
        this.isSubmitted = false;
        this.userExist = false;
        this.sections = [];
        this.branchSelect = new FormControl(null);
        this.unsubscribeAll = new Subject();
        this.formLoading = false;
        this.branches = [];
        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.dynamicMode = false;
        this.invalidAccess = false;
        this.addcarer = false;
        this.attendanceFormStatus = '';
        this.sections = data.sections;
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     *  On Init
     */
    ngOnInit(): void {
        this._setSectionElementsData();
    }

    _setSectionElementsData() {
        this.waitlistForm = new FormGroup({
            recaptcha: new FormControl('', Validators.required),
        });
        this.sections.forEach(g => {
            this.waitlistForm.addControl(g.section_code, new FormGroup({})) // section_code group create
            const section = this.waitlistForm.get(g.section_code) as FormGroup; // get section_code group to section constance
            g.inputs.forEach(x => {
                if ('attendance' == x.input_name) {
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
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.email, Validators.maxLength(150)] : [Validators.email, Validators.maxLength(150)]),
                    }))
                } else if ('text-area' == x.input_type) {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.maxLength(250)] : Validators.maxLength(250)),
                    }))
                } else {
                    section.addControl(x.input_name, new FormGroup({
                        [x.input_hiddenfield_name]: new FormControl(x.hidden),
                        [x.input_placeholder_name]: new FormControl(x.input_placeholder),
                        [x.input_required]: new FormControl(x.input_mandatory),
                        [x.input_name]: new FormControl('', (x.input_mandatory) ? [Validators.required, Validators.maxLength(250)] : Validators.maxLength(150)),
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
            saturday: [false],
            sunday: [false]
        });
    }

    getFields() {
        return this.sections;
    }

    ngDistroy() {
        this.unsubcribe();
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


    checkedFieldsGet(data: { event: boolean, name: string, value: string }): void {
        if (data.event) {
            this.checkBoxes.push({
                name: data.name,
                value: data.value
            });
        } else {
            this.checkBoxes.splice(this.checkBoxes.indexOf(data.value), 1);
        }
    }

}



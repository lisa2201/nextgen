import {Component, OnInit, Inject, ViewEncapsulation, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {ActivatedRoute} from '@angular/router';
import {Validators, FormBuilder, FormGroup, FormControl, FormArray} from '@angular/forms';
import {helpMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {ViewWaitlistComponent} from '../view-waitlist/view-waitlist.component';
import {CommonService} from 'app/shared/service/common.service';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {AppConst} from 'app/shared/AppConst';
import {NotificationService} from 'app/shared/service/notification.service';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {AuthService} from 'app/shared/service/auth.service';
import {WaitListEnrollmentService} from '../../../service/waitlist-enrollment.service';
import {FileListItem} from 'app/shared/components/s3-upload/s3-upload.model';
import {YesValidator} from 'app/shared/validators/yes-validator';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs/internal/Subject';

@Component({
    selector: 'app-edit-waitlist',
    templateUrl: './edit-waitlist.component.html',
    styleUrls: ['./edit-waitlist.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class EditWaitlistComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    action: string;
    buttonString: string;
    dialogTitle: string;        // dialog title changes on edit/view
    editMode: boolean;          // edit or view?
    isSubmitted: boolean;
    waitlistForm: FormGroup; // waitlist Form
    currentYear: number;
    buttonLoading: boolean;
    priorityDetails: string[];
    registrationMode: boolean;
    mediaChannels: string[];
    otherOption = 'Other';
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive
    showHearAbout: boolean;

    indeterminate: boolean;
    allChecked: any;
    buttonLoader: boolean;
    branchDetails: any;
    childBornChecked: boolean;
    elementSettings: any;
    newInputs: any
    newSections: any;
    checkBoxes: any = [];
    form: string;
    mobile: boolean = false;
    attendanceChecked: boolean = false;
    validForAttendance: boolean = false
    validateUploads: boolean = true
    uploadedFiles: object = []
    checkedUploading: boolean[] = [];
    uploadSwitchInputs: object = [];
    signaturesList: any = [];
    signatureTemp: any = [];

    constructor(
        public matDialogRef: MatDialogRef<ViewWaitlistComponent>,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _formBuilder: FormBuilder,
        private _route: ActivatedRoute,
        private _commonService: CommonService,
        private _waitListService: WaitListEnrollmentService,
        private _notification: NotificationService,
        private _auth: AuthService,
    ) {
        this.action = _data.action;

        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.buttonString = 'Update';
            this.dialogTitle = 'Edit Waitlist';
            this.editMode = true;
        } else {
            this.buttonString = 'Create Waitlist';
            this.dialogTitle = 'Enquiry to Waitlist';
            this.editMode = false;
        }
        this.branchDetails = this._auth.getClient();
        this.showHearAbout = false;
        this.priorityDetails = [
            'Priority 1',
            'Priority 2',
            'Priority 3',
        ];
        this.mediaChannels = [
            'Google',
            'Friend or Relative',
            'Word of Mouth',
            'Facebook',
            'MyWaitlist',
            'Website',
            'CareForKids.com.au',
            'Email',
            'Employer',
            'MyChild Website',
            'Returning Family',
            this.otherOption
        ];
        if (window.screen.width < 415) {
            this.mobile = true;
        }
        this.waitlistForm = new FormGroup({});
        this.buttonLoader = false;
        // console.log('this._data')
        // console.log(this._data)

        this.newInputs = AppConst.modalActionTypes.NEW === this.action ? [].concat(..._.map(this._data.response.settings, (val: any, idx: number) => val.inputs)) : this._data.response.waitlist.waitlist_info.new_inputs.filter(i => i.waitlist_section !== '');
        this.newSections = AppConst.modalActionTypes.NEW === this.action ? this._data.response.settings : _.sortBy(this._data.response.waitlist.waitlist_info.section_inputs['waitlist'], 'order');
        this.uploadedFiles = (this._data.response.waitlist.waitlist_info.upload_files) ? this._data.response.waitlist.waitlist_info.upload_files : [];
        // this.signaturesList =
        this.form = AppConst.appStart.WAITLIST.NAME;

        if (this.newInputs?.length > 0) {
            this._newInputsValidate();
        }

        const attendanceIndex = this.newInputs.findIndex(i => i.name === 'attendance')
        if (attendanceIndex !== -1 && this.newInputs[attendanceIndex].required === true) {
            this.validForAttendance = true;
        }
        this._unsubscribeAll = new Subject();
    }


    ngOnInit(): void {
        this._hearAboutChange();
        this.uploadsInputsValidate()
    }


    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    attendanceCheck(): boolean {
        if (_.isEmpty(this.waitlistForm.value.attendance)) {
            return false
        }

        for (const i in this.waitlistForm.value.attendance[0]) {
            if (this.waitlistForm.value.attendance[0][i] !== undefined && this.waitlistForm.value.attendance[0][i] === true) return false;
        }
        return this.validForAttendance
    }

    uploadsInputsValidate(): void {
        this.newInputs.forEach(x => {
            if (x.input_type === 'upload-switch' && x.waitlist_section !== '') {
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

    trackByFn(index: number, item: any): number {
        return index;
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.waitlistForm.controls;
    }

    _hearAboutChange(): void {
        if (!this.editMode) {
            return
        }
        this.waitlistForm.get('hearAbout').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: string) => {

                const hearAboutOtherInput = this.waitlistForm.get('hearAbout');

                if (value === this.otherOption) {

                    this.showHearAbout = true;
                    hearAboutOtherInput.setValidators(Validators.required);
                    hearAboutOtherInput.updateValueAndValidity();
                    hearAboutOtherInput.reset();
                } else {

                    this.showHearAbout = false;
                    hearAboutOtherInput.clearValidators();
                    hearAboutOtherInput.updateValueAndValidity();
                    hearAboutOtherInput.reset();

                }
            });
    }

    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }

        this.waitlistForm.reset();

        for (const key in this.fc) {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }

    }

    /**
     * Form submit handler
     */
    onFormSubmit(e: MouseEvent): void {
        e.preventDefault()
        // this.invalidget();
        this.buttonLoader = true;

        if (!this.waitlistForm.valid) {
            this.buttonLoader = false;
            return;
        }

        const tot = [];/* selected checkboxes values for input fields*/
        for (const y of this.newInputs) {
            const adjust = [];
            for (const i of this.checkBoxes) {
                // @ts-ignore
                if (y.name === i.name) {
                    adjust.push(i.value);
                }
            }
            // @ts-ignore
            tot[y.name] = (adjust)

            // /* signatures fill */
            // for (const i of this.signaturesList) {
            //     if (y.name === i.name) {
            //         tot[y.name] = i.value;
            //     }
            // }
        }
        // console.log(tot)
        // return;
        const updatedNewInputs = [];
        if (this.newInputs?.length > 0) {
            this.newInputs.forEach(x => {
                if (x['waitlist_section'] !== '') {
                    updatedNewInputs.push({
                        name: x['name'],
                        values: (tot[x['name']].length > 0) ? tot[x['name']] : (x['waitlist_section'] !== '') ? this.waitlistForm.controls[x['name']].value : ''
                    })
                }
            })
        }
        // return;
        const formValues = this.waitlistForm.value;


        const sendData = {
            id: this._data.response.waitlist.id ?? null,
            directWaitlist: !this.editMode,
            childborn: _.isEmpty(formValues?.child_bornOrNot) ? '' : formValues.child_bornOrNot,
            firstname: _.isEmpty(formValues?.firstname) ? '' : formValues.firstname,
            middlename: _.isEmpty(formValues?.middlename) ? '' : formValues.middlename,
            lastname: _.isEmpty(formValues?.lastname) ? '' : formValues.lastname,
            gender: (formValues.child_bornOrNot) ? formValues.childGender : '',
            sibilings: !_.isEmpty(formValues?.siblingAttend) || formValues.siblingAttend === true ? true : false,
            crn: _.isEmpty(formValues?.crn) ? '' : formValues.crn,
            date_of_birth: (formValues.child_bornOrNot) ? DateTimeHelper.getUtcDate(formValues.dateOfBirth) : '',
            enrolment_date: _.isEmpty(formValues?.startDate) ? '' : DateTimeHelper.getUtcDate(formValues.startDate),
            priority: _.isEmpty(formValues?.priority) ? '' : formValues.priority,
            attendance: _.isEmpty(formValues?.attendance) ? '' : formValues.attendance[0],
            parentfirstname: _.isEmpty(formValues?.parentFirstname) ? '' : formValues.parentFirstname,
            parentmiddlename: _.isEmpty(formValues?.parentmiddlename) ? '' : formValues.parentmiddlename,
            parentlastname: _.isEmpty(formValues?.parentlastname) ? '' : formValues.parentlastname,
            parent_date_of_birth: _.isEmpty(formValues?.parentdateOfBirth) ? '' : DateTimeHelper.getUtcDate(formValues.parentdateOfBirth),
            email: _.isEmpty(formValues?.parentEmail) ? '' : formValues.parentEmail,
            parentcrn: _.isEmpty(formValues?.parentprimaryCarer) ? '' : formValues.parentprimaryCarer,
            address: _.isEmpty(formValues?.parentAddress) ? '' : formValues.parentAddress,
            suburb: _.isEmpty(formValues?.parentSuburb) ? '' : formValues.parentSuburb,
            country: _.isEmpty(formValues?.parentCountry) ? '' : formValues.parentCountry,
            postalCode: formValues?.parentPC !== undefined && formValues.parentPC !== '' ? formValues.parentPC : '',
            state: _.isEmpty(formValues?.parentState) ? '' : formValues.parentState,
            phone: _.isEmpty(formValues?.parentPhone) ? '' : formValues.parentPhone,
            mobile: _.isEmpty(formValues?.parentMobile) ? '' : formValues.parentMobile,
            parentWorkMob: _.isEmpty(formValues?.parentWorkMob) ? '' : formValues.parentWorkMob,
            parentWorkPN: _.isEmpty(formValues?.parentWorkPN) ? '' : formValues.parentWorkPN,
            hearAbout: _.isEmpty(formValues?.hearAbout) ? '' : formValues.hearAbout,
            hearAboutOther: _.isEmpty(formValues?.hearAboutOther) ? '' : formValues.hearAboutOther,
            updatedAllInputs: updatedNewInputs,
            upload_files: this.finalizeUploadFiles(),
        };
        // console.log('this.sendData')
        // console.log(formValues.parentPC)
        // console.log(sendData)
        // return;
        this._waitListService.updateWaitListChild(sendData)
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((code: string) => {
                if (!code) {
                    return;
                }
                setTimeout(() => this.matDialogRef.close(code), 250);

                setTimeout(() => {
                    this.isSubmitted = true;
                    this.buttonLoader = false;

                    if (this.scrollDirective) {
                        this.scrollDirective.scrollToTop();
                    }
                }, 300);
            });

    }

    /**
     * add attendance to form array
     */

    addAttendanceCheckbox(data): FormGroup {

        return this._formBuilder.group({
            monday: [data.length === 0 ? false : data['monday']],
            tuesday: [data.length === 0 ? false : data['tuesday']],
            wednesday: [data.length === 0 ? false : data['wednesday']],
            thursday: [data.length === 0 ? false : data['thursday']],
            friday: [data.length === 0 ? false : data['friday']],
            allDays: [data.length === 0 ? false : data['allDays']],
            // saturday: [data['saturday']],
            // sunday: [data['sunday']]
        });
    }

    invalidget() {
        const invalid = [];
        const controls = this.waitlistForm.controls;
        for (const name in controls) {
            if (controls[name].invalid) {
                invalid.push(name);
            }
        }
        console.log(invalid)
    }

    _newInputsValidate(): void {
        this.newInputs.forEach(x => {
            if (x['waitlist_section'] !== '') {

                const answer = AppConst.modalActionTypes.NEW === this.action ? !_.isEmpty(this._data.response.waitlist.waitlist_info.new_inputs.find(i => i.enquiry_section !== '' && i.name === x['name'])) ? this._data.response.waitlist.waitlist_info.new_inputs.find(i => i.enquiry_section !== '' && i.name === x['name']).values : '' : !_.isEmpty(this._data.response.waitlist.waitlist_info.new_inputs.find(i => i.waitlist_section !== '' && i.name === x['name'])) ? this._data.response.waitlist.waitlist_info.new_inputs.find(i => i.waitlist_section !== '' && i.name === x['name']).values : '';

                if (x['input_type'] === 'text-area') {
                    this.waitlistForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required, Validators.maxLength(250)] : Validators.maxLength(250)))
                } else if ('crn' === x['name'] || 'parentprimaryCarer' === x['name']) {
                    this.waitlistForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required, Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')] : [Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9]+$')]))
                } else if (x['input_type'] === 'textbox') {
                    this.waitlistForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required, Validators.maxLength(150)] : Validators.maxLength(150)))
                } else if (x['input_type'] === 'select-checkbox' && x['name'] === 'attendance') {
                    this.waitlistForm.addControl(x['name'], this._formBuilder.array([this.addAttendanceCheckbox(typeof this._data.response.waitlist.waitlist_info?.attendance !== 'undefined' ? this._data.response.waitlist.waitlist_info.attendance : [])]))
                } else if (x['input_type'] === 'switch' || x['input_type'] === 'upload-switch' || x['input_type'] === 'checkbox') {
                    this.waitlistForm.addControl(x['name'], new FormControl(answer === '' || answer === null || answer === false ? false : answer, (x['required'] && !(x['name'] === 'child_bornOrNot')) ? YesValidator.YesOnly : null))
                } else if (x['input_type'] === 'select-multiple') {
                    this.waitlistForm.addControl(x['name'], new FormControl(answer === '' || answer === null || answer === false ? [] : answer, (x['required']) ? [Validators.required] : null))
                } else {
                    this.waitlistForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required] : null))
                }

                /*checkbox - selected multiple option defualt set on array for use update data collection*/
                if (x['input_type'] === 'checkbox' && typeof answer !== 'boolean' && Array.isArray((answer)) && (answer).length > 0) {
                    // console.log('checkbox values ' + x['name']);
                    // console.log(answer);
                    // @ts-ignore
                    for (const i of answer) {
                        this.checkBoxes.push({
                            name: x['name'],
                            value: i
                        });
                    }
                }

                if ('signature' === x['input_type']) {
                    this.signaturesList.push({
                        name: x['name'],
                        required: x['required'],
                        section: x['waitlist_section'],
                        value: answer
                    });
                }
            }
        })
    }

    checkedFieldsGet(data: { event: boolean, name: string, value: string, sectionCode: string }): void {
        if (data.event) {
            this.checkBoxes.push({
                name: data.name,
                value: data.value
            });
            this.waitlistForm.get(data.name).patchValue(true, {emitEvent: false});
        } else {
            this.checkBoxes.splice(this.checkBoxes.indexOf(data.value), 1);
        }
        // console.log(this.checkBoxes)
    }

    get attendanceArray() {
        return this.waitlistForm.get('attendance') as FormArray;
    }

    mandatoryChange(index): void {
        const ob = this.attendanceArray.value[index];
        this.attendanceChecked = (Object.values(ob).indexOf(true) > -1);
        this.validForAttendance = this.attendanceChecked
    }

    newUploads(data: { fileList: FileListItem[], inputName: string }): void {
        this.uploadedFiles[data.inputName] = _.map(data.fileList, 'key');
    }

    finalizeUploadFiles(): any {
        return _.omit(this.uploadedFiles, _.keys(_.pickBy(this.uploadedFiles, (value, key) => {
            if (value === false) {
                return true
            }
        })));
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
                this.waitlistForm.get(this.signatureTemp[x.section][key]['name']).patchValue(this.signaturesList[keyy]['value'], {emitEvent: false});
            }
        })
    }
}

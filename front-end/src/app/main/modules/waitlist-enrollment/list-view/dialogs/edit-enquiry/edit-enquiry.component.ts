import {Component, OnInit, Inject, ViewEncapsulation, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {Validators, FormGroup, FormControl} from '@angular/forms';
import {helpMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import {ViewWaitlistComponent} from '../view-waitlist/view-waitlist.component';
import {FusePerfectScrollbarDirective} from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import {AppConst} from 'app/shared/AppConst';
import {AuthService} from 'app/shared/service/auth.service';
import {WaitListEnrollmentService} from '../../../service/waitlist-enrollment.service';
import {FileListItem} from 'app/shared/components/s3-upload/s3-upload.model';
import {YesValidator} from 'app/shared/validators/yes-validator';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs/internal/Subject';

@Component({
    selector: 'app-edit-enquiry',
    templateUrl: './edit-enquiry.component.html',
    styleUrls: ['./edit-enquiry.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class EditEnquiryComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    action: string;
    buttonString: string;
    dialogTitle: string;        // dialog title changes on edit/view
    editMode: boolean;          // edit or view?
    isSubmitted: boolean;
    enquiryForm: FormGroup; // Enquiry Form
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
        private _waitListService: WaitListEnrollmentService,
        private _auth: AuthService,
    ) {
        this.action = _data.action;

        if (this.action === AppConst.modalActionTypes.EDIT) {
            this.buttonString = 'Update';
            this.dialogTitle = 'Edit Enquiry';
            this.editMode = true;
        }
        this.branchDetails = this._auth.getClient();
        this.showHearAbout = false;

        if (window.screen.width < 415) {
            this.mobile = true;
        }
        this.enquiryForm = new FormGroup({});
        this.buttonLoader = false;

        this.newInputs = this._data.response.enquiry.waitlist_info.new_inputs.filter(i => !_.isEmpty(i.enquiry_section) && i.enquiry_section !== '');
        console.log('this.newInputs')
        console.log(this.newInputs)
        this.newSections = _.sortBy(this._data.response.enquiry.waitlist_info.section_inputs['enquiry'], 'order');
        this.uploadedFiles = (this._data.response.enquiry.waitlist_info.upload_files) ? this._data.response.enquiry.waitlist_info.upload_files : [];
        // this.signaturesList =
        this.form = AppConst.appStart.ENQUIRY.NAME;

        if (this.newInputs?.length > 0) {
            this._newInputsValidate();
        }

        this._unsubscribeAll = new Subject();
    }


    ngOnInit(): void {
        this.uploadsInputsValidate()
    }


    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    uploadsInputsValidate(): void {
        this.newInputs.forEach(x => {
            if (x.input_type === 'upload-switch' && x.enquiry_section !== '') {
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
        return this.enquiryForm.controls;
    }

    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }

        this.enquiryForm.reset();

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

        if (!this.enquiryForm.valid) {
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
                if (x['enquiry_section'] !== '') {
                    updatedNewInputs.push({
                        name: x['name'],
                        values: (tot[x['name']].length > 0) ? tot[x['name']] : (x['enquiry_section'] !== '') ? this.enquiryForm.controls[x['name']].value : ''
                    })
                }
            })
        }
        // return;
        const formValues = this.enquiryForm.value;


        const sendData = {
            id: this._data.response.enquiry.id ?? null,
            email: _.isEmpty(formValues?.parentEmail) ? '' : formValues.parentEmail,
            firstname: _.isEmpty(formValues?.parentFirstname) ? '' : formValues.parentFirstname,
            lastname: _.isEmpty(formValues?.parentlastname) ? '' : formValues.parentlastname,
            mobile: _.isEmpty(formValues?.parentMobile) ? '' : formValues.parentMobile,
            age: _.isEmpty(formValues?.childAge) ? '' : formValues.childAge,
            updatedAllInputs: updatedNewInputs,
            upload_files: this.finalizeUploadFiles(),
        };

        this._waitListService.updateEnquiryChild(sendData)
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

    invalidget() {
        const invalid = [];
        const controls = this.enquiryForm.controls;
        for (const name in controls) {
            if (controls[name].invalid) {
                invalid.push(name);
            }
        }
        console.log(invalid)
    }

    _newInputsValidate(): void {
        this.newInputs.forEach(x => {
            if (x['enquiry_section'] !== '') {

                const answer = !_.isEmpty(this._data.response.enquiry.waitlist_info.new_inputs.find(i => i.enquiry_section !== '' && i.name === x['name'])) ? this._data.response.enquiry.waitlist_info.new_inputs.find(i => i.enquiry_section !== '' && i.name === x['name']).values : '';

                if (x['input_type'] === 'text-area') {
                    this.enquiryForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required, Validators.maxLength(250)] : Validators.maxLength(250)))
                } else if (x['input_type'] === 'textbox') {
                    this.enquiryForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required, Validators.maxLength(150)] : Validators.maxLength(150)))
                } else if (x['input_type'] === 'switch' || x['input_type'] === 'upload-switch' || x['input_type'] === 'checkbox') {
                    this.enquiryForm.addControl(x['name'], new FormControl(answer === '' || answer === null || answer === false ? false : answer, (x['required'] && !(x['name'] === 'child_bornOrNot')) ? YesValidator.YesOnly : null))
                } else if (x['input_type'] === 'select-multiple') {
                    this.enquiryForm.addControl(x['name'], new FormControl(answer === '' || answer === null || answer === false ? [] : answer, (x['required']) ? [Validators.required] : null))
                } else {
                    this.enquiryForm.addControl(x['name'], new FormControl(answer, (x['required']) ? [Validators.required] : null))
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
                        section: x['enquiry_section'],
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
            this.enquiryForm.get(data.name).patchValue(true, {emitEvent: false});
        } else {
            this.checkBoxes.splice(this.checkBoxes.indexOf(data.value), 1);
        }
        // console.log(this.checkBoxes)
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
                this.enquiryForm.get(this.signatureTemp[x.section][key]['name']).patchValue(this.signaturesList[keyy]['value'], {emitEvent: false});
            }
        })
    }
}

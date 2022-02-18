import {Component, Inject, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import {ActivatedRoute} from '@angular/router';
import {EnrollmentsService} from '../../services/enrollments.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';
import {AppConst} from 'app/shared/AppConst';
import {ParagraphComponent} from './paragraph/paragraph.component';
import {SectionService} from '../../services/section.service';
import * as DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import * as _ from 'lodash';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/internal/operators/takeUntil';
import {finalize} from 'rxjs/operators';

interface Select {
    label: string;
    value: string;
}

@Component({
    selector: 'app-input-add',
    templateUrl: './input-add.component.html',
    styleUrls: ['./input-add.component.scss'],
    encapsulation: ViewEncapsulation.None
})


export class InputAddComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    public Editor = DecoupledEditor;
    buttonLoader: boolean;
    newInputForm: FormGroup;
    selectedInputType: string;
    newOne: { question: any; size: any; placeholder: any; type: any; required: any };
    section: any
    waitlistSections: any;
    placeholder: boolean;
    listOfOption: any;
    listOfTagOptions = [];
    inputEdit: any;
    title: string
    settingsMaster: string
    transferable: boolean;
    transferableToWaitlist: boolean;
    transferableActive: boolean;
    transferableActiveWait: boolean;
    required: boolean;
    fileUploadRequired: boolean;
    hidden: boolean;
    multi: boolean;
    dialogRef: any;
    paragraph: string;
    forNewField: boolean = true;
    forNewFieldAndMandory: boolean = false;
    sizeDisable: boolean = false;
    sizes: Select[] = [
        {label: '1/3 Column', value: 'small'},
        {label: '1/2 Column', value: 'medium'},
        {label: '2/3 Column', value: 'other'},
        {label: '1 Column', value: 'large'},
    ]
    sectionslist: Select[] = [];
    sectionslistWaitlist: Select[] = [];

    inputTypesList: Select[] = [
        {label: 'Single Input', value: 'textbox'},
        {label: 'Dropdown', value: 'select'},
        {label: 'Checkbox', value: 'checkbox'},
        {label: 'Toggle', value: 'switch'},
        {label: 'Date', value: 'date-picker'},
        {label: 'Multiline', value: 'text-area'},
        {label: 'Paragraph', value: 'richTextBox'},
        {label: 'File Upload', value: 'upload-switch'},
        {label: 'Hyperlink', value: 'hyperlink'},
        {label: 'Signature', value: 'signature'},
    ]
    public config = {
        placeholder: 'Type the content here!'
    };

    // @Output() newInputEvent =new EventEmitter<object>()

    constructor(
        private _formBuilder: FormBuilder,
        public matDialogRef: MatDialogRef<InputAddComponent>,
        private _enrollmentService: EnrollmentsService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _route: ActivatedRoute,
        private _sectionService: SectionService,
        @Inject(MAT_DIALOG_DATA) public data: any,
    ) {
        // Set the defaults
        this.buttonLoader = false;
        this.selectedInputType = '';
        this.paragraph = '';
        this.newInputForm = this.createInputForm();
        this.section = data.section;
        this.inputEdit = (data?.inputEdit !== undefined) ? data?.inputEdit : []
        this.title = 'Add New Question';
        this.transferable = false;
        this.transferableToWaitlist = false;
        this.transferableActive = false;
        this.transferableActiveWait = false;
        this.waitlistSections = data.sections;
        this.settingsMaster = data.settingsMaster
        this.multi = false;

        this._sectionService.getSections().forEach(x => {
            if (x.section_code !== 'emergency_contact_details') {
                const y: Select = {
                    label: x.title,
                    value: x.section_code
                }
                this.sectionslist.push(y)
            }
        })

        this._sectionService.getWaitlistSections().forEach(x => {
            const y: Select = {
                label: x.title,
                value: x.section_code
            }
            this.sectionslistWaitlist.push(y)
        })
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }


    ngOnInit(): void {
        this.placeholder = false
        this.required = false
        this.fileUploadRequired = false
        this.hidden = false


        if (Object.keys(this.inputEdit).length > 0) {
            this.title = 'Edit';

            if (this.inputEdit.types.useInWait) {
                this.transferableToWaitlist = true
                this.transferableActiveWait = true
                this.newInputForm.addControl('relevantSectionWaitlist', new FormControl(this.inputEdit.types.WaitlistForSection))
            }

            if (this.inputEdit.types.useInEnrol) {
                this.transferable = true
                this.transferableActive = true
                this.newInputForm.addControl('relevantSection', new FormControl(this.inputEdit.types.EnrolForSection))
            }

            this.required = this.inputEdit.input_mandatory
            this.hidden = this.inputEdit.hidden
            this.forNewField = this.inputEdit.status === 'new'
            this.sizeDisable = this.inputEdit.input_type === 'signature';
            this.forNewFieldAndMandory = this.inputEdit.status !== 'new' && this.inputEdit.input_mandatory_changeable
            this.newInputForm.addControl('hidden', new FormControl(this.inputEdit.hidden))
            setTimeout(() => {
                this.valuesSet();
            }, 100);

        }

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    private valuesSet(): void {
        this.sizeDisable = false;
        this.newInputForm.get('size').patchValue((this.inputEdit.column_height === '33') ? 'small' : (this.inputEdit.column_height === '50') ? 'medium' : (this.inputEdit.column_height === '100') ? 'large' : 'other', {emitEvent: false});
        this.newInputForm.get('type').patchValue((this.inputEdit.input_type === 'select-multiple') ? 'select' : this.inputEdit.input_type, {emitEvent: false});
        if (this.inputEdit.input_type === 'textbox' || this.inputEdit.input_type === 'text-area' || this.inputEdit.input_type === 'date-picker') {
            this.newInputForm.get('placeholder').patchValue(this.inputEdit.input_placeholder, {emitEvent: false});
        } else if (this.inputEdit.input_type === 'select' || this.inputEdit.input_type === 'select-multiple') {
            this.multi = this.inputEdit.types.multiple
            this.listOfTagOptions = this.inputEdit.types.options
            this.newInputForm.get('placeholder').patchValue(this.inputEdit.input_placeholder, {emitEvent: false});
            // this.newInputForm.get('selectOptions').patchValue(this.inputEdit.types.options, {emitEvent: false});
        } else if (this.inputEdit.input_type === 'checkbox') {
            this.listOfTagOptions = this.inputEdit.types.options
            this.multi = this.inputEdit.types.multiple
        } else if (this.inputEdit.input_type === 'hyperlink') {
            this.newInputForm.get('hyperlink').patchValue(this.inputEdit.types.hyperlink, {emitEvent: false});
        } else if (this.inputEdit.input_type === 'signature') {
            this.newInputForm.get('size').patchValue('large', {emitEvent: false});
            this.sizeDisable = true;
        }
        this.newInputForm.get('question').patchValue(this.inputEdit.question ?? 'Click here to add text', {emitEvent: false});
        this.newInputForm.get('required').patchValue(this.inputEdit.input_mandatory, {emitEvent: false});
        this.fileUploadRequired = this.inputEdit.types?.fileUploadRequired !== undefined && this.inputEdit.types.fileUploadRequired;
        this.multiChange()
    }


    /**
     * reset form
     *
     * @param {MouseEvent} e
     */
    resetForm(e: MouseEvent): void {
        if (e) {
            e.preventDefault();
        }
        this.selectedInputType = '';
        setTimeout(() => this.newInputForm.reset(), 20);

        this.listOfTagOptions = [];

    }

    createInputForm(): FormGroup {
        return new FormGroup({
            type: new FormControl('', [Validators.required]),
            question: new FormControl(this.paragraph, [Validators.required]),
            size: new FormControl('', [Validators.required]),
            required: new FormControl(false),
            transferable: new FormControl(false),
            transferableToWaitlist: new FormControl(false),
            multiple: new FormControl(false),
        });
    }

    formChange(type): void {
        this.selectedInputType = type;
        this.sizeDisable = false;

        if (type === 'textbox' || type === 'text-area' || type === 'date-picker') {
            this.newInputForm.addControl('placeholder', new FormControl('', [Validators.required, Validators.maxLength(150)]))
            this.newInputForm.removeControl('selectOptions')
            this.newInputForm.removeControl('hyperlink')
            this.placeholder = true;
        } else if (type === 'select' || type === 'select-multiple') {
            this.newInputForm.addControl('placeholder', new FormControl('', [Validators.required, Validators.maxLength(150)]))
            this.newInputForm.addControl('selectOptions', new FormControl([], [Validators.required]))
            this.newInputForm.removeControl('hyperlink')
            this.placeholder = true;
        } else if (type === 'checkbox' || type === 'upload-switch' || type === 'switch' || type === 'signature') {
            this.newInputForm.removeControl('placeholder')
            this.newInputForm.removeControl('hyperlink')
            this.placeholder = false;
            this.sizeDisable = type === 'signature';
            if (type === 'signature') {
                this.newInputForm.get('size').patchValue('large', {emitEvent: false});
            } else if (type === 'upload-switch') {
                this.newInputForm.addControl('fileUploadRequired', new FormControl(false, []))
            }
        } else if (type === 'hyperlink') {
            this.newInputForm.addControl('hyperlink', new FormControl('', [Validators.pattern('(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?'), Validators.required]))
            this.newInputForm.removeControl('placeholder')
            this.newInputForm.removeControl('selectOptions')
            this.placeholder = false;
        } else if (type === 'richTextBox') {
            this.newInputForm.removeControl('placeholder')
            this.newInputForm.removeControl('selectOptions')
            this.newInputForm.removeControl('hyperlink')
            this.placeholder = false;
            if (this.title !== 'Edit') {
                this.previewParagraphBox();
            }
        }
        this.multi = false;
    }


    previewParagraphBox(): void {
        // if (this.selectedInputType !== 'richTextBox' && this.selectedInputType !== 'hyperlink') {
        //     return
        // }
        setTimeout(() => this.buttonLoader = false, 200);

        this.dialogRef = this._matDialog
            .open(ParagraphComponent,
                {
                    height: '650px',
                    panelClass: 'preview-paragraph-form',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {},
                        question: this.paragraph
                    }
                });
        this.dialogRef.afterClosed().subscribe(result => {
            if (result.paragraph !== '') {
                this.paragraph = result.paragraph;
            }
        });

    }

    multiChange(): void {
        if (this.multi && this.selectedInputType === 'checkbox') {
            this.newInputForm.addControl('selectOptions', new FormControl([], [Validators.required]))
        } else if (!this.multi && this.selectedInputType === 'checkbox') {
            this.newInputForm.removeControl('selectOptions')
        } else if ((!this.multi || this.multi) && (this.selectedInputType === 'select' || this.selectedInputType === 'select-multiple')) {
            this.newInputForm.addControl('selectOptions', new FormControl([], [Validators.required]))
        }
    }

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.newInputForm.controls;
    }

    onFormSubmit(e: MouseEvent): void {

        e.preventDefault();
        if (this.newInputForm.invalid) {
            return;
        }

        const obj = {
            type: this.fc.type.value,
            question: this.fc.question.value,
            placeholder: _.isEmpty(this.fc.placeholder) ? '' : this.fc.placeholder.value,
            size: this.fc.size.value,
            required: this.fc.required.value,
            selectOptions: _.isEmpty(this.fc.selectOptions) ? [] : {'options': this.fc.selectOptions.value},
            section: this.section.id,
            sectionTitle: this.section.title,
            sectionCode: this.section.section_code,
            edit: (this.title === 'Edit') ? this.inputEdit?.id : '',
            hidden: (this.title === 'Edit') ? this.fc.hidden?.value : '',
            useInEnrol: !_.isEmpty(this.fc.transferable) ? this.fc.transferable.value : false,
            useInWait: !_.isEmpty(this.fc.transferableToWaitlist) ? this.fc.transferableToWaitlist.value : false,
            hyperlink: !_.isEmpty(this.fc.hyperlink) ? this.fc.hyperlink.value : '',
            fileUploadRequired: !_.isEmpty(this.fc.fileUploadRequired) ? this.fc.fileUploadRequired.value : '',
            form: this.settingsMaster,
            multiple: (this.multi) ? this.fc.multiple?.value : false
        }

        /*waitlist*/
        if ((this.title !== 'Edit' && this.settingsMaster === 'enquiry') || ((this.settingsMaster === 'enquiry' && this.inputEdit.access_for === 'enquiry') || (this.settingsMaster === 'waitlist' && this.inputEdit.access_for === 'both') || (this.settingsMaster === 'enquiry' && this.inputEdit.access_for === 'both') || (this.settingsMaster === 'enquiry' && this.inputEdit.access_for === 'enq-wait') || (this.settingsMaster === 'enquiry' && this.inputEdit.access_for === 'enq-enr') || (this.settingsMaster === 'enquiry' && this.inputEdit.access_for === 'triple'))) {
            obj['WaitlistForSection'] = !_.isEmpty(this.fc.transferableToWaitlist) ? !_.isEmpty(this.fc.relevantSectionWaitlist) ?
                {
                    'section_code': this.fc.relevantSectionWaitlist.value,
                    'section_index': this.settingsMaster === AppConst.appStart.WAITLIST.NAME ? this.waitlistSections.find(x => x.section_code === this.fc.relevantSectionWaitlist.value).id : this._sectionService.getWaitlistSections().find(x => x.section_code === this.fc.relevantSectionWaitlist.value).id
                }
                : '' : '';
            obj['EnrolForSection'] = !_.isEmpty(this.fc.transferable) ? !_.isEmpty(this.fc.relevantSection) ?
                {
                    'section_code': this.fc.relevantSection.value,
                    'section_index': this._sectionService.getSections().find(x => x.section_code === this.fc.relevantSection.value).id
                }
                : '' : '';
        }

        /*enrolment*/
        if ((this.title !== 'Edit' && this.settingsMaster === 'waitlist') || ((this.settingsMaster === 'waitlist' && this.inputEdit.access_for === 'waitlist') || (this.settingsMaster === 'waitlist' && this.inputEdit.access_for === 'both') || (this.settingsMaster === 'enquiry' && this.inputEdit.access_for === 'enq-wait') || (this.settingsMaster === 'enquiry' && this.inputEdit.access_for === 'enq-enr') || (this.settingsMaster === 'enquiry' && this.inputEdit.access_for === 'triple'))) {
            obj['EnrolForSection'] = !_.isEmpty(this.fc.transferable) ? !_.isEmpty(this.fc.relevantSection) ?
                {
                    'section_code': this.fc.relevantSection.value,
                    'section_index': this._sectionService.getSections().find(x => x.section_code === this.fc.relevantSection.value).id
                }
                : '' : '';
        }

        this.buttonLoader = true;

        this._enrollmentService
            .storeNewInput(obj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            )
            .subscribe(
                res => {
                    if (res.code === 200) {
                        setTimeout(() => this._notification.displaySnackBar((this.title === 'Edit') ? 'Successfully updated to the Form.' : 'Successfully added to the Form.', NotifyType.SUCCESS), 200);
                    } else {
                        setTimeout(() => this._notification.displaySnackBar('Add failed.', NotifyType.ERROR), 500);
                    }

                    setTimeout(() => this.matDialogRef.close(res.message), 250);
                },
                error => {
                    this.buttonLoader = false;

                    throw error;
                },
                () => {
                    // this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    transferableAction(): void {
        if (this.transferable) {
            this.transferableActive = true;
            this.newInputForm.addControl('relevantSection', new FormControl('', [Validators.required]))
        } else {
            this.transferableActive = false;
            this.newInputForm.removeControl('relevantSection')
        }
    }

    transferableActionWaitlist(): void {
        if (this.transferableToWaitlist) {
            this.transferableActiveWait = true;
            this.newInputForm.addControl('relevantSectionWaitlist', new FormControl('', [Validators.required]))
        } else {
            this.transferableActiveWait = false;
            this.newInputForm.removeControl('relevantSectionWaitlist');
        }
    }

}

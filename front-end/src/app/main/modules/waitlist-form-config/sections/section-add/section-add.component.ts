import {
    Component,
    EventEmitter,
    Input,
    OnChanges, OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {EnrollmentsService} from '../../services/enrollments.service';
import {Subject} from 'rxjs';
import {SectionService} from '../../services/section.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';
import {shareReplay, takeUntil} from 'rxjs/operators';

@Component({
    selector: 'section-add',
    templateUrl: './section-add.component.html',
    styleUrls: ['./section-add.component.scss']
})
export class SectionAddComponent implements OnInit, OnChanges, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    @Output()
    sectionAdded: EventEmitter<any>;

    @Input() editSection
    @Input() settingsMaster
    @Input() editValues: object;
    @ViewChild('sectionInput', {static: false})
    nameInputField;
    editOn: boolean = false;
    secId: string = '';
    formActive: boolean;
    isLoading: boolean = false;
    form: FormGroup;

    constructor(
        private _formBuilder: FormBuilder,
        private _enrolmentsService: EnrollmentsService,
        private _sectionService: SectionService,
        private _notification: NotificationService,
    ) {     // Set the defaults
        this.formActive = false;
        this.sectionAdded = new EventEmitter();
        this.editSection = Subject
        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.editSection) {
            if (this.editSection !== '') {
                this.editForm()
                this.editOn = true;
                this.secId = this.editValues['sec_id']
            }
        }
    }

    ngOnInit(): void {
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------


    /**
     * Edit form
     */
    editForm(): void {
        this.form = this._formBuilder.group({
            new_section_name: [this.editValues['name']]
        });
        this.formActive = true;
        this.isLoading = false;
        this.focusNameField();
    }

    /**
     * Open form
     */
    openForm(): void {
        this.form = this._formBuilder.group({
            new_section_name: ''
        });
        this.formActive = true;
        this.editOn = false
        this.editSection = '';
        this.focusNameField();
    }

    /**
     * Close form
     */
    closeForm(): void {
        this.form.get('new_section_name').patchValue('', {emitEvent: false});
        this.formActive = false;
        this.editOn = false
    }

    closeFormAuto(): void {
        if (this.form.getRawValue().new_section_name === '' || this.editValues?.['name'] === 'undefined' || this.form.getRawValue().new_section_name === this.editValues?.['name']) {
            this.closeForm();
        }
    }

    /**
     * Focus to the name field
     */
    focusNameField(): void {
        setTimeout(() => {
            this.nameInputField.nativeElement.focus();
        });
    }

    /**
     * On form submit
     */
    onFormSubmit(): void {
        this.isLoading = true;

        if (this.form.valid) {
            const data = {
                name: this.form.getRawValue().new_section_name,
                updatation: this.editOn,
                sec_id: this.secId,
                form: this.settingsMaster,
            }

            if (data.updatation && this.secId !== 'newSection') {
                this._sectionService.sectionNameRename(data)
                    .pipe(
                        takeUntil(this._unsubscribeAll),
                        shareReplay()
                    )
                    .subscribe(value => {
                        if (value.code === 200) {
                            this.sectionAdded.next(data);
                            this.formActive = false;
                            this._notification.clearSnackBar();
                            setTimeout(() => this._notification.displaySnackBar('Updated Successfully', NotifyType.SUCCESS), 200);
                        } else {
                            this._notification.clearSnackBar();
                            setTimeout(() => this._notification.displaySnackBar('Update Failure', NotifyType.ERROR), 200);
                        }
                        this.isLoading = false;
                    })
                this.editOn = false;
            } else {
                this.sectionAdded.next(data);
                this.formActive = false;
                this.isLoading = false;
            }
        }
        this.editSection = '';
    }


}

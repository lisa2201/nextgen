import {
    Component,
    OnInit,
    ViewEncapsulation,
    OnDestroy,
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
import {Subject} from 'rxjs';
import {shareReplay} from 'rxjs/operators';
import {takeUntil} from 'rxjs/internal/operators/takeUntil';

@Component({
    selector: 'app-waitlist-form',
    templateUrl: './enquiry-form.component.html',
    styleUrls: ['./enquiry-form.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class EnquiryFormComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    panelOpenState = false;
    waitlist: Waitlist;
    public sections: any[]
    public selectedSection: [];
    // Form
    public enquiryForm: FormGroup; // Enrollment Form


    settingsMaster: string;
    dialogRef: any;
    // common
    buttonLoader: boolean;
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive
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
        this.settingsMaster = AppConst.appStart.ENQUIRY.NAME;
        this._sectionService.storeSections(this._route.snapshot.data['enrolmentSet']['data']);
        this._sectionService.storetWaitlistSections(this._route.snapshot.data['waitlistSet']['data']);
        this.lastUpdated = new Date();
        this._unsubscribeAll = new Subject();
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

    ngOnDestroy(): void {
        // Close all dialogs
        this._matDialog.closeAll();
        // Unsubscribe from all subscriptions

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    private getAllSectionsRefreshed(): void {
        // @ts-ignore
        this._sectionService.enrolmentDynamicFields(this.settingsMaster)
            .pipe(
                takeUntil(this._unsubscribeAll),
                shareReplay()
            )
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
        this.enquiryForm = new FormGroup({
            agreement: new FormControl(true, Validators.requiredTrue),
            // recaptcha: new FormControl('', Validators.required),
            recaptcha: new FormControl('xx'),
        });
        const dates = [];
        this.sections.forEach(g => {
            dates.push(new Date(g.section_latest_updated_at))
            this.enquiryForm.addControl(g.section_code, new FormGroup({})) // section_code group create
            const section = this.enquiryForm.get(g.section_code) as FormGroup; // get section_code group to section constance
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
                        response: {},
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

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Set select data
     */
    _setInitData(): void {
        const resolverSections = this._route.snapshot.data['sectionsSet'];
        if (!_.isEmpty(resolverSections)) {
            this.sections = resolverSections['data'];
        }

    }


    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any {
        return this.enquiryForm.controls;
    }

    /**
     * submit form
     *
     * @param {MouseEvent} e
     */

    onFormSubmit(e: MouseEvent): void {
        if (this.enquiryForm.invalid) {
            return;
        }

        this.loadingActiveSave = true;
        const sendData =
            {
                'form': this.settingsMaster,
                'form_data': this.enquiryForm.value,
            }

        this._enrollmentService.enrollChildMasterData(sendData)
            .pipe()
            .subscribe((code: string) => {
                if (!code) {
                    this.loadingActiveSave = false;
                    return;
                }
                if (code === '200') {
                    setTimeout(() => this._notification.displaySnackBar('success', NotifyType.SUCCESS), 200);

                }
                this._notification.clearSnackBar();
                setTimeout(() => this._notification.displaySnackBar('Successfully updated.', NotifyType.SUCCESS), 200);

                this.loadingActiveSave = false;
                setTimeout(() => {
                    this._enrollmentService.setSaveButtonActivate(false);
                    if (this.scrollDirective) {
                        this.scrollDirective.scrollToTop();
                    }
                }, 300);
            });
    }

    previewWaitlist(e: MouseEvent): void {
        e.preventDefault();
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
    }
}

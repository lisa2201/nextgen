import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Subject} from 'rxjs';
import {FormGroup} from '@angular/forms';
import {FuseSidebarService} from '@fuse/components/sidebar/sidebar.service';
import {fadeMotion, NzModalRef, NzModalService, slideMotion} from 'ng-zorro-antd';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {InputAddComponent} from '../sections/input-add/input-add.component';
import {AppConst} from 'app/shared/AppConst';
import {AuthService} from 'app/shared/service/auth.service';
import {Clipboard} from '@angular/cdk/clipboard';
import {NotificationService} from 'app/shared/service/notification.service';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {EnrollmentService} from '../services/enrollment.service';
import {EnrollmentsService} from '../services/enrollments.service';
import {finalize, takeUntil} from 'rxjs/operators';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

@Component({
    selector: 'section-template',
    templateUrl: './section-template.component.html',
    styleUrls: ['./section-template.component.scss'],
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({duration: 100}),
        fadeOutOnLeaveAnimation({duration: 100})
    ]
})
export class SectionTemplateComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    @Input() selectedSection
    @Input() formGroup: FormGroup;
    @Input() settingsMaster;
    buttonLoader: boolean;
    inputsLoading: boolean = false;
    dialogRef: any;
    time: string[];

    siteManagerUrl: string;
    branchUrl: string;
    organizationId: string;
    isSiteManager: boolean;
    confirmModal: NzModalRef;
    urlParse: string = '';
    list: any;
    activeEle: string;

    constructor(
        private _fuseSidebarService: FuseSidebarService,
        private _matDialog: MatDialog,
        private _authService: AuthService,
        private _clipBoard: Clipboard,
        private _notificationService: NotificationService,
        private _enrolmentService: EnrollmentService,
        private _enrolmentsService: EnrollmentsService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
    ) {
        this.time = [
            'AM',
            'PM',
            'All Day'
        ];
        this.buttonLoader = false;
        this.isSiteManager = this._authService.isOwnerPath() ? false : true;
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.activeEle = '';
    }

    ngOnInit(): void {
        this.urlParse = (document.location.pathname === '/master/' + (this.settingsMaster === AppConst.appStart.WAITLIST.NAME) ? AppConst.appStart.WAITLIST.NAME : AppConst.appStart.ENQUIRY.NAME) ? this.settingsMaster === AppConst.appStart.WAITLIST.NAME ? AppConst.appStart.WAITLIST.BASE_URL : this.settingsMaster === AppConst.appStart.ENQUIRY.NAME ? AppConst.appStart.ENQUIRY.BASE_URL : AppConst.appStart.ENROLLMENT.BASE_URL : AppConst.appStart.ENROLLMENT.BASE_URL;
        this.getOrganizatioID();
        this.branchUrl = this.constructBranchUrl();
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        if (this.confirmModal) {
            this.confirmModal.close();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    drop(event: CdkDragDrop<string[]>) {
        moveItemInArray(this.selectedSection.inputs, event.previousIndex, event.currentIndex);
        this.selectedSection.inputs.forEach((value, index) => {
            this.formGroup.get(this.selectedSection['section_code'] + '.' + value['input_name'] + '.order').patchValue(index + 1, {emitEvent: false});
        })
        this._enrolmentsService.setSaveButtonActivate(true);
    }

    getOrganizatioID(): void {
        if (this.organizationId !== '' && this._authService.getClient()?.organizationId == null) {
            this._enrolmentService.getOrganizationInfo().subscribe(value => {
                this.organizationId = value.id;
                this.siteManagerUrl = this.constructSitemanagerUrl()
            })
        } else if (this._authService.getClient()?.organizationId != null) {
            this.organizationId = this._authService.getClient().organizationId;
            this.siteManagerUrl = this.constructSitemanagerUrl()
        }
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }


    editInput(e, input): void {
        e.preventDefault();
        // if (input.status !== 'new' && !input.input_mandatory_changeable) {
        //     return;
        // }
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
                        inputEdit: input,
                        settingsMaster: this.settingsMaster,
                    }
                });
    }

    constructSitemanagerUrl(): string {
        const host = document.location.host;
        const splitUrl = host.split('.');


        // if (_.last(splitUrl) === 'au') {
        //     splitUrl.splice(-1, 1);
        // }
        splitUrl.shift();
        return `http://enrolment.${splitUrl.join('.')}${this.urlParse}?${AppConst.queryParamKeys.ENROLMENT.orgId}=${this.organizationId}`;
    }

    constructBranchUrl(): string {
        const host = document.location.host;
        return `http://${host}${this.urlParse}`;
    }

    openLink(event: MouseEvent, url: string): void {
        event.preventDefault();
        window.open(url);
    }

    goToField(name: string): void {
        const el = document.getElementById(name);
        this.activeEle = name;
        // el.scrollIntoView({behavior: 'smooth', block: 'start', inline: 'nearest'});
        el.scrollIntoView();
    }

    copyToClipBoard(event: MouseEvent, url: string): void {
        event.preventDefault();
        this._clipBoard.copy(url);
        this._notificationService.displaySnackBar('URL Copied!', NotifyType.SUCCESS);
    }

    deleteField(e, input): void {
        e.preventDefault();
        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to delete this?',
                    nzContent: 'Please be aware this operation cannot be reversed. If this was the action that you wanted to do, please confirm your choice, or cancel.',
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {
                            this.inputsLoading = true;
                            const sendObj = {
                                input_id: input.id,
                                form: this.settingsMaster,
                            };
                            this._enrolmentsService.removeField(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        // this.tableLoading = false;
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => {
                                            this.inputsLoading = false;
                                            this._notification.displaySnackBar(message.message, NotifyType.SUCCESS);
                                            // this.onTableChange();
                                        }, 200);
                                    },
                                    error => {
                                        this.inputsLoading = false;
                                        throw error;
                                    }
                                );
                        });
                        this.inputsLoading = false;
                    }
                }
            );
    }

    htmlTagRemover(text: string): string {
        return text.replace(/<\/?[^>]+(>|$)/g, '');
    }
}

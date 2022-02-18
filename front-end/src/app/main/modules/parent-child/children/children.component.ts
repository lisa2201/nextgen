import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { NGXLogger } from 'ngx-logger';
import { ChildrenService } from '../../child/services/children.service';
import { takeUntil, isEmpty, finalize, map } from 'rxjs/operators';
import { Child } from '../../child/child.model';
import { Subject } from 'rxjs';
import { ParentChildrenService } from '../service/parent-children.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { ParentChildService } from '../service/parent-child.service';
import { Router, ChildActivationStart, ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { SessionRoutine, SessionRoutineItem } from '../../child/enrolment/enrolment.component';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Enrolment } from '../../child/enrolment/models/enrolment.model';
import { Fee } from '../../centre-settings/fees/model/fee.model';
import * as uuid from 'uuid';
import * as moment from 'moment';
import { ChildBookingService } from '../../child/booking/services/booking.service';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';
import { AuthClient } from 'app/shared/model/authClient';
import { AuthService } from 'app/shared/service/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { BranchAddDialogComponent } from '../../branch/dialogs/new/new.component';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { ViewCwaContentComponent } from '../view-cwa-content/view-cwa-content.component';
import { CommonService } from '../../../../shared/service/common.service';
import { EditChildInfoDialogComponent } from '../edit-child-info-dialog/edit-child-info-dialog.component';
import { ChildDocumentsService } from '../../child/documents/services/child-documents.service';
// import { ChildAddNewDocumentComponent } from '../../child/documents/dialogs/child-add-new-document.component';
import { AddNewAllergyComponent } from '../add-new-allergy/add-new-allergy.component';
import { HealthMedical } from '../../child/health-medical/health-medical.model';
import { AddNewDocumentComponent } from '../add-new-document/add-new-document.component';

@Component({
    selector: 'parent-children-list',
    templateUrl: './children.component.html',
    styleUrls: ['./children.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildrenComponent implements OnInit, OnDestroy {
    childrenList: Child[];
    defaultchild: Child;
    newChild: Child;
    index: number;
    private _unsubscribeAll: Subject<any>;
    noData: boolean;
    disableFilterButton: boolean;
    selectedChild: Child;
    pageLoading: boolean;
    disabledPrev: boolean;
    disabledNext: boolean;
    sessionRoutines: SessionRoutine[];
    enrolment: Enrolment[];
    fees: Fee[];
    hideWeekEnd: boolean;
    client: AuthClient;
    dialogRef: any;

    ImmunisationTrackingUITypes: typeof AppConst.ImmunisationTrackingUITypes;

    documents: any[];
    documentsData: any[];
    healthDocuments: string[];
    legalDocuments: string[];
    otherDocuments: string[];

    uploadTypes: string;
    s3Bucket: string;
    s3Path: string;
    uploadFileMap: object;
    documentDataID: string;
    DocButtonSize: string;
    buttonLoader: boolean;
    initLoading: boolean;
    confirmModal: any;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    constructor(
        private _logger: NGXLogger,
        private _ParentchildrenService: ParentChildrenService,
        private _ParentchildService: ParentChildService,
        private _fuseSidebarService: FuseSidebarService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _authService: AuthService,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
        private _modalService: NzModalService,
        private _commonService: CommonService,
        private _documentsService: ChildDocumentsService,
    ) {
        this.defaultchild = null;
        this.selectedChild = null;
        this._unsubscribeAll = new Subject();
        this.pageLoading = false;
        this.disabledPrev = false;
        this.sessionRoutines = [];
        this.hideWeekEnd = false;
        this.client = this._authService.getClient();

        this.ImmunisationTrackingUITypes = AppConst.ImmunisationTrackingUITypes;
        
        this.documents = null;
        this.documentsData = [];
        this.healthDocuments = ['healthRecord', 'childImmunised', 'prescribedMedicine', 'anaphylaxis', 'healthConditions', 'asthma', 'epipenOrAnipen'];
        this.legalDocuments = ['courtAppointed'];
        this.otherDocuments = ['birthCertificate'];

        this.uploadTypes = 'image/*, application/pdf';
        this.s3Bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
        this.s3Path = AppConst.s3Paths.CHILD_Profile;
        this.uploadFileMap = {};
        this.DocButtonSize = 'small';
    }

    // tslint:disable-next-line: typedef
    ngOnInit() {
        this._logger.debug('child list view !!!');

        this._ParentchildService.onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: Child) => {
                this._logger.debug('[child]', child);

                if (child) {

                    this.defaultchild = child;
                    this.documents = this.defaultchild.documents.documents;

                    this.documentDataID = this.defaultchild.documents.id;
                    if (this.defaultchild.documents)
                        this.uploadFileMap = this.documents;
                    this.createDocumentArray();
                }


            });

        this._ParentchildService.onchildrenChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((Children: Child[]) => {
                this._logger.debug('[Children]', Children);

                if (Children) {
                    this.childrenList = Children;
                    this.defaultchild = this.childrenList.find(x => x.id === this.defaultchild.id);
                    this.index = this.childrenList.findIndex(x => x.id === this.defaultchild.id);
                }
            });

        this.setButtonDisable();
        this.enrolment = this.defaultchild.enrollments;
        this.setSessionRoutines();

        this._route.params.subscribe(params => {
            const term = params['id'];
            this._logger.debug('router change work !!!');
            this._ParentchildrenService.getChild(term).subscribe((response: Child) => {
                this.defaultchild = response;
                this.enrolment = this.defaultchild.enrollments;
                this.setSessionRoutines();
            });
        });

        this._ParentchildService.onEntrolmentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((enrolment: Enrolment[]) => {
                this._logger.debug('[Enrolment changed]', enrolment);

                if (enrolment) {

                    this.enrolment = enrolment;
                }
            });



    }

    setNewChild(): Child {

        return this.newChild = this.childrenList.length > 0 ? this.childrenList[this.index] : null;

    }
    setSessionRoutines(): void {

        this.sessionRoutines = [];
        this._logger.debug('this.entroldata', this.enrolment);
        this.enrolment.map((e: any, idx: number) => {

            const startDate = moment(e.enrolStart).startOf('week');
            const endDate = startDate.clone().add(e.weekCycle === '0' ? 6 : 13, 'd');
            const dateRange = DateTimeHelper.getDateRange(startDate, endDate);

            // generate week map
            for (const [index, item] of dateRange.entries()) {
                if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0)) {
                    continue;
                }

                const sessions = e.routines.routine.filter((r: { date: string; }) => r.date === item.format('YYYY-MM-DD'));

                this.sessionRoutines.push({
                    id: uuid.v4(),
                    date: item.toDate(),
                    day: _.toLower(item.format('ddd')),
                    cycleWeek: dateRange.length > 7 && index > 7 ? 2 : 1,
                    sessions: sessions
                });
            }

        });

    }
    ngOnDestroy(): void {
        this.childrenList = [];
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._ParentchildService.resetDeclarations();
        this.defaultchild = null;
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }



    childNext(e: MouseEvent): void {
        e.preventDefault();
        if (this.index === this.childrenList.length - 1) {
            return;
        }

        this.pageLoading = true;
        this.index = ++this.index;
        this.setButtonDisable();
        this.setNewChild();
        this._router.navigate(['/children/' + this.newChild.id], { relativeTo: this._route });
        setTimeout(() => {
            this.pageLoading = false;
        }, 1500);

    }

    childPrevious(e: MouseEvent): void {
        e.preventDefault();
        if (this.index === 0) {
            return;
        }
        this.pageLoading = true;
        this.index = --this.index;
        this.setButtonDisable();
        this.setNewChild();
        this._router.navigate(['/children/' + this.newChild.id], { relativeTo: this._route });
        setTimeout(() => {
            this.pageLoading = false;
        }, 1000);
    }

    setButtonDisable(): void {

        this.disabledNext = (this.index === this.childrenList.length - 1) ? true : false;
        this.disabledPrev = this.index === 0 ? true : false;
    }


    trackByFn(idx: number, item: any): number {
        return idx;
    }

    openDialog(e: MouseEvent, item: Enrolment): void {
        e.preventDefault();

        if (item) {
            item.isLoading = true;
        }

        setTimeout(
            () => (
                (item.isLoading = false),
                (this.dialogRef = this._matDialog.open(ViewCwaContentComponent, {
                    panelClass: 'view-cwa-content-modal',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        entrolment: this.enrolment.find(x => x.id === item.id),
                        child: this.defaultchild
                    }
                })),
                this.dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(message => {
                        if (!message) {
                            return;
                        }

                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                    })
            ),
            300
        );
    }

    getChildProfileImage(item): string {
        if (item.image)
            return this._commonService.getS3FullLinkforProfileImage(item.image);
        else
            return `assets/icons/flat/ui_set/custom_icons/child/${(item.gender === '0' ? 'boy_sm' : 'girl_sm')}.svg`;
    }

    editBasicInfo(e: MouseEvent, isHealth: boolean) {

        e.preventDefault();

        this.pageLoading = true;

        setTimeout(() => this.pageLoading = false, 200);

        this.dialogRef = this._matDialog
            .open(EditChildInfoDialogComponent,
                {
                    panelClass: 'edit-child-info-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: isHealth,
                        child: this.defaultchild
                    }
                });

        this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message => {
                if (!message) {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
            });
    }

    findDocument(item): any {
        return this.documentsData.find(element => { return element.name === item })
    }

    getFileName(key: string): string {
        return this._commonService.extractS3FileName(key);
    }

    deleteFile(doc, docTitle): void {
        this._modalService.confirm({
            nzTitle: 'Are you sure delete this document?',
            nzContent: '<b style="color: red;">This action is irreversible</b>',
            nzOkText: 'Yes',
            nzOkType: 'danger',
            nzOnOk: () => this.deleteDocumentSubmit(doc, docTitle),
            nzCancelText: 'No',
        });

    }

    deleteDocumentSubmit(doc, docTitle): void {
        const x = this.documentsData.find(element => { return element.fileurl.includes(doc) });
        const index = x.fileurl.indexOf(doc);
        if (index > -1) {
            x.fileurl.splice(index, 1);
            const documentIndex = this.documentsData.indexOf(x);
            if (documentIndex > -1) {
                this.documentsData[documentIndex] = x;
            }
        }
        this.uploadFileMap[docTitle] = this.uploadFileMap[docTitle].filter(x => x !== doc);
        this.onFormSubmit(null);
    }

    onFormSubmit(e: MouseEvent): void {
        if (e)
            e.preventDefault();

        const sendObj = {
            documentID: this.documentDataID,
            childId: this._route.snapshot.params['id'],
            upload_files: this.uploadFileMap
        };
        console.log(sendObj);
        this.buttonLoader = true;
        this._documentsService
            .storeDocuments(sendObj)
            .pipe()
            .subscribe(
                message => {
                    this.buttonLoader = false;
                    this._notification.clearSnackBar();

                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                },
                error => {
                    this.buttonLoader = false;

                    throw error;
                },

            );
    }

    createDocumentArray(): void {
        this.documentsData = [];
        for (const item in this.documents) {
            const obj = {};
            obj['name'] = item;
            obj['fileurl'] = this.documents[item];
            this.documentsData.push(obj);
        }
    }

    addNewDocument(e: MouseEvent): void {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(AddNewDocumentComponent,
                {
                    panelClass: 'child-add-new-document',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {
                            childId: this._route.snapshot.params['id'],
                            currentDocuments: this.documents,
                            documentId: this.documentDataID
                        }
                    },
                    width: '600px',
                });

        this.dialogRef
            .afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(message => {
                if (!message) {
                    return;
                }

                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                this._ParentchildService.getChild(this.defaultchild.id);
            });
    }

    addNewAllergy(e: MouseEvent): void {

        e.preventDefault();
        this.buttonLoader = true;
        this._ParentchildService
            .getAllergyTypes()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.buttonLoader = false, 200))
            ).subscribe(
                response => {
                    this.dialogRef = this._matDialog
                        .open(AddNewAllergyComponent,
                            {
                                panelClass: 'add-new-child-allergy-parent',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.NEW,
                                    response: {
                                        allergyTypes: response,
                                        childId: this._route.snapshot.params['id'],
                                    }
                                }
                            });

                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(message => {
                            if (!message) {
                                return;
                            }

                            this.buttonLoader = false
                            this._notification.clearSnackBar();

                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                }
            );

    }

    editAllergy(e: MouseEvent, item: HealthMedical): void {

        e.preventDefault();
        item.isLoading = true;
        this._ParentchildService
            .getAllergyTypes()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => item.isLoading = false, 200))
            ).subscribe(
                response => {
                    this.dialogRef = this._matDialog
                        .open(AddNewAllergyComponent,
                            {
                                panelClass: 'add-new-child-allergy-parent',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.EDIT,
                                    response: {
                                        allergyTypes: response,
                                        childId: this._route.snapshot.params['id'],
                                        item: item
                                    }
                                }
                            });

                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(message => {
                            if (!message) {
                                return;
                            }
                            item.isLoading = false;
                            this._notification.clearSnackBar();

                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                }
            );

    }

    delete(item: HealthMedical, e: MouseEvent): void {
        e.preventDefault();
        item.isLoading = true;
        setTimeout(() => item.isLoading = false, 500);
        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.DELETE.TITLE,
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {
                            this._ParentchildService
                                .deleteAllergy(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => {
                                        console.log(message);
                                        
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        item.isLoading = false;
                                    },
                                    error => {
                                        item.isLoading = false;
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    onNavClick(e: MouseEvent, route?: string): void
    {
        e.preventDefault();

        if (route)
        {
            setTimeout(() => this._router.navigate([route]), 250);    
        }
    }
}

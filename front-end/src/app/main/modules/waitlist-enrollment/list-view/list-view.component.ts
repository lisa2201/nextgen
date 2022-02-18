import {Component, Injectable, OnDestroy, OnInit} from '@angular/core';
import {WaitlistEnrollment} from '../waitlist-enrollment-list/waitlist-enrollment.model';
import {WaitListEnrollmentService} from '../service/waitlist-enrollment.service';
import {DateTimeHelper} from 'app/utils/date-time.helper';
import {fuseAnimations} from '@fuse/animations';
import {fadeInOnEnterAnimation, fadeOutOnLeaveAnimation} from 'angular-animations';
import {takeUntil, debounceTime, distinctUntilChanged, finalize} from 'rxjs/operators';
import * as _ from 'lodash';
import {FormControl} from '@angular/forms';
import {forkJoin, Subject} from 'rxjs';
import {NGXLogger} from 'ngx-logger';
import {AppConst} from 'app/shared/AppConst';
import {NzModalRef, NzModalService, slideMotion} from 'ng-zorro-antd';
import {NotifyType} from 'app/shared/enum/notify-type.enum';
import {NotificationService} from 'app/shared/service/notification.service';
import {ViewWaitlistComponent} from './dialogs/view-waitlist/view-waitlist.component';
import {MatDialog} from '@angular/material/dialog';
import {Router} from '@angular/router';
import {ViewEnrollmentComponent} from './dialogs/view-enrollment/view-enrollment.component';
import {EditWaitlistComponent} from './dialogs/edit-waitlist/edit-waitlist.component';
import {EditEnrolmentComponent} from './dialogs/edit-enrolment/edit-enrolment.component';
import {FuseSidebarService} from '@fuse/components/sidebar/sidebar.service';
import {UrlHelper} from 'app/utils/url.helper';
import {WaitlistEnrolmentNotesService} from '../service/waitlist-enrolment-notes.service';
import {ViewNoteComponent} from '../notes/view-note/view-note.component';
import {CountryResolverService} from 'app/main/common/public/waitlist/services/country-resolver.service';
import {Country} from 'app/shared/model/common.interface';
import {ChildrenService} from '../../child/services/children.service';
import {SetChildRoomsComponent} from '../modals/set-child-rooms/set-child-rooms.component';
import {BranchesListComponent} from './dialogs/branches-list/branches-list.component';
import {AuthService} from 'app/shared/service/auth.service';
import {EditEnquiryComponent} from './dialogs/edit-enquiry/edit-enquiry.component';

@Injectable()
@Component({
    selector: 'app-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    animations: [
        fuseAnimations,
        slideMotion,
        fadeInOnEnterAnimation({duration: 300}),
        fadeOutOnLeaveAnimation({duration: 300})
    ]
})
export class ListViewComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total: number;
    enquiredCount: number;
    waitlistCount: number;
    emailedCount: number;
    enroledtCount: number;
    activetCount: number;
    tableLoading: boolean;
    mobilePagination: boolean;

    dialogRef: any;
    filterValue: any = null;

    Waitlist: WaitlistEnrollment[];
    confirmModal: NzModalRef;

    searchInput: FormControl;
    buttonLoader: boolean;
    statusValue: { status: number; };
    siteManager: boolean = false;
    _domain: string
    countriesList: Country[] = []; // Country Select
    setRoomModal: NzModalRef;

    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _enrollmentService: WaitListEnrollmentService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _router: Router,
        private _fuseSidebarService: FuseSidebarService,
        private _countryResolverService: CountryResolverService,
        private _childrenService: ChildrenService,
        private _waitlistEnrolmentNotesService: WaitlistEnrolmentNotesService,
        private _auth: AuthService,
    ) {

        // Set defaults
        this.buttonLoader = false;
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;
        this.pageSize = this._enrollmentService.defaultPageSize;
        this.pageIndex = this._enrollmentService.defaultPageIndex;
        this.pageSizeOptions = this._enrollmentService.defaultPageSizeOptions;
        this.searchInput = new FormControl({value: null, disabled: false});
        this.statusValue = {status: this._enrollmentService.currentType};

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this._domain = UrlHelper.extractTenantNameFromUrl(location.host);
    }

    ngOnInit(): void {

        this._enrollmentService
            .onWaitlistChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[waitlist table]', response);
                this.Waitlist = response.items;
                this.total = response.totalDisplay;
                this.enquiredCount = response.enquiredCount;
                this.waitlistCount = response.waitlistCount;
                this.emailedCount = response.emailedCount;
                this.enroledtCount = response.enroledtCount;
                this.activetCount = response.activetCount;
                this.statusValue = {status: this._enrollmentService.currentType};
            });


        this.searchInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(searchText => {
                this._logger.debug('[search change]', searchText);

                // reset page index
                this.pageIndex = this._enrollmentService.defaultPageIndex;

                if (!_.isNull(searchText)) {

                    this._enrollmentService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._enrollmentService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {

                this.tableLoading = value;

            });
        this.siteManager = this._domain === AppConst.appStart.SITE_MANAGER.NAME;

        this._countryResolverService
            .resolve()
            .pipe()
            .subscribe((value: any) => {
                this.countriesList = value[0];
            });

        // Subscribe to filter changes
        this._enrollmentService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._enrollmentService.defaultPageIndex;
            });

        if (history.state.category !== undefined && history.state.category === AppConst.appStart.WAITLIST.NAME) {
            this.loadTab(0, history.state.selectedBranch);
        }
    }

    /**
     * On Destroy
     */
    ngOnDestroy(): void {
        if (this.setRoomModal) {
            this.setRoomModal.close();
        }
        this._enrollmentService.clearLastRememberOptions();
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    getage(value: any): any {
        return DateTimeHelper.getDob(value);
    }

    /**
     * Toggle sidebar
     *
     * @param name
     */
    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    widgetFilter(status: number, e: MouseEvent): void {
        e.preventDefault();
        this.loadTab(status);
    }

    loadTab(status: number, selectedBranch: string = null): void {
        this.statusValue = {status: status};
        if (selectedBranch != null) {
            this.statusValue['branch'] = selectedBranch;
        }
        this._enrollmentService.currentType = status;
        this._enrollmentService.pagination.pageIndex = 1;
        this._enrollmentService.onFilterChanged.next(this.statusValue);
    }

    /**
     * Enroll wait list item
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    parentEnroll(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();
        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.CONFIRM_EMAIL.TITLE,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'primary',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {
                            this._enrollmentService.onTableLoaderChanged.next(true);
                            this._enrollmentService
                                .sendMail(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => setTimeout(() => {
                                        this._enrollmentService.onTableLoaderChanged.next(false);
                                        resolve()
                                    }, 200))
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => this._notification.displaySnackBar('Successfully Sent', NotifyType.SUCCESS), 200);
                                        this.ngOnInit();
                                    },
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    /**
     * clear search
     *
     * @param {MouseEvent} e
     */
    clearSearch(e: MouseEvent, _emit: boolean = true): void {
        if (!_.isNull(e)) {
            e.preventDefault();
        }

        this.searchInput.patchValue('', {emitEvent: _emit});
    }


    /**
     * get items for table
     *
     * @param {boolean} [reset=false]
     */
    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._enrollmentService.defaultPageIndex;
        }

        this._enrollmentService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * View wait list item
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    viewBeforeEnroll(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();
        this._enrollmentService.onTableLoaderChanged.next(true)
        setTimeout(() => {
                this.dialogRef = this._matDialog
                    .open(ViewWaitlistComponent,
                        {
                            panelClass: 'waitlist-view-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                response: {
                                    waitlist: item
                                }
                            }
                        });
                this._enrollmentService.onTableLoaderChanged.next(false);
            }
            , 200)
    }

    /**
     * View wait list item
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    viewBeforeActivate(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();

        this.dialogRef = this._matDialog
            .open(ViewEnrollmentComponent,
                {
                    panelClass: 'enrollment-view-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {
                            allergyTypes: this._enrollmentService.onAllergyChanged.value,
                            waitlist: item
                        }
                    }
                });
    }

    branchChange(item: WaitlistEnrollment, e: MouseEvent, type: string): void {
        e.preventDefault();
        this.dialogRef = this._matDialog
            .open(BranchesListComponent,
                {
                    panelClass: 'branches-list-view-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        item: item,
                        form: type,
                    }
                });
    }


    notes(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();
        this._enrollmentService.onTableLoaderChanged.next(true);
        this._waitlistEnrolmentNotesService
            .getNotesForEnrolmentOrWaitlist(item)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => {
                    this._enrollmentService.onTableLoaderChanged.next(false);
                }, 200))
            )
            .subscribe(
                response => {

                    // if (_.isEmpty(response.data)) {
                    //     return;
                    // }
                    this.dialogRef = this._matDialog
                        .open(ViewNoteComponent,
                            {
                                panelClass: 'notes-view-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.NEW,
                                    response: {
                                        notes: response.data,
                                        item: item,
                                        status: item.status,
                                    }
                                }
                            });
                });
    }

    /**
     * Activate child
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    activate(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.CONFIRM_ACTIVATION.TITLE,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'primary',
                    nzOnOk: () => {
                        this._enrollmentService
                            .getRooms(item.branch_id)
                            .pipe(
                                finalize(() => {
                                    setTimeout(() => this.buttonLoader = false, 100);
                                })
                            )
                            .subscribe(response => {
                                this.setRoomModal = this._modalService
                                    .create({
                                        nzTitle: 'Activate Options',
                                        nzContent: SetChildRoomsComponent,
                                        nzMaskClosable: false,
                                        nzComponentParams: {
                                            rooms: response,
                                            item: item
                                        },
                                        nzWrapClassName: 'custom-search-list',
                                        nzFooter: [
                                            {
                                                label: 'SAVE',
                                                type: 'primary',
                                                disabled: componentInstance => !(componentInstance!.ChildSetRoomForm.valid),
                                                onClick: componentInstance => {
                                                    const selectedRoom = componentInstance.getSelectedRoom();
                                                    const sendMail = componentInstance.getEzidebitMailOption();

                                                    if (!_.isNull(selectedRoom)) {
                                                        return new Promise((resolve, reject) => {
                                                            this._enrollmentService
                                                                .createChild({
                                                                    id: item.id,
                                                                    room_id: selectedRoom['id'],
                                                                    send_ezidebit_mail: sendMail
                                                                })
                                                                .pipe(
                                                                    takeUntil(this._unsubscribeAll),
                                                                    finalize(() => resolve(null))
                                                                )
                                                                .subscribe(
                                                                    message => {
                                                                        this.setRoomModal.destroy();
                                                                        setTimeout(() => this._notification.displaySnackBar('Successfully Activated', NotifyType.SUCCESS), 200);
                                                                    },

                                                                    error => {
                                                                        throw error;
                                                                    }
                                                                );
                                                        });
                                                    }

                                                    this.setRoomModal.destroy();
                                                }
                                            },
                                            {
                                                label: 'CLOSE',
                                                type: 'danger',
                                                onClick: () => this.setRoomModal.destroy()
                                            }
                                        ]
                                    });

                                // this.setRoomModal
                                //     .afterOpen
                                //     .pipe(takeUntil(this._unsubscribeAll))
                                //     .subscribe(() => setTimeout(() => this.setRoomModal.getContentComponent().updateListScroll(), 250));
                            });

                    }
                }
            );
    }

    /**
     * Delete wait list item
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    delete(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();

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
                            this._enrollmentService
                                .deleteWaitlisedItem(item.status, item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => setTimeout(() =>
                                        this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200,
                                    ),
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    editEnquiry(item: WaitlistEnrollment, e: MouseEvent): void {
        console.log('xxxx')
        console.log(item)
        e.preventDefault();
        this.dialogRef = this._matDialog
            .open(EditEnquiryComponent,
                {
                    panelClass: 'enquiry-edit-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        response: {
                            enquiry: item,
                            countriesList: this.countriesList,
                        }
                    }
                });

        this.dialogRef
            .afterClosed()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => {
                }, 200))
            )
            .subscribe(message => {
                if (!message) {
                    return;
                }
                this._notification.clearSnackBar();

                setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
            });

    }

    editWaitlist(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();
        this._enrollmentService.onTableLoaderChanged.next(true);
        this._enrollmentService
            .getDirectProcessesForSettings((item['status'] == '5' || item['status'] == '6' ? AppConst.appStart.ENQUIRY.NAME : AppConst.appStart.WAITLIST.NAME), item.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => {
                    this._enrollmentService.onTableLoaderChanged.next(false);
                }, 200))
            )
            .subscribe(
                response => {
                    if (_.isEmpty(response)) {
                        return;
                    }
                    this.dialogRef = this._matDialog
                        .open(EditWaitlistComponent,
                            {
                                panelClass: 'waitList-edit-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: item['status'] == '5' || item['status'] == '6' ? AppConst.modalActionTypes.NEW : AppConst.modalActionTypes.EDIT,
                                    response: {
                                        waitlist: item,
                                        settings: response,
                                        countriesList: this.countriesList,
                                    }
                                }
                            });

                    this.dialogRef
                        .afterClosed()
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            finalize(() => setTimeout(() => {
                                this._enrollmentService.onTableLoaderChanged.next(false);
                            }, 200))
                        )
                        .subscribe(message => {
                            if (!message) {
                                return;
                            }
                            this._notification.clearSnackBar();

                            setTimeout(() => this._notification.displaySnackBar('Successfully ' + item['status'] == '5' ? 'Created' : 'Updated', NotifyType.SUCCESS), 200);
                        });
                });
    }

    editEnrolment(item: WaitlistEnrollment, e: MouseEvent): void {

        e.preventDefault();
        this._enrollmentService.onTableLoaderChanged.next(true)

        setTimeout(() => {
                this.dialogRef = this._matDialog
                    .open(EditEnrolmentComponent,
                        {
                            panelClass: 'enrolment-edit-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.EDIT,
                                response: {
                                    allergyTypes: this._enrollmentService.onAllergyChanged.value,
                                    enrolitem: item,
                                    countriesList: this.countriesList,
                                }
                            }
                        })
                    .afterClosed()
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(message => {
                        if (!message) {
                            return;
                        }

                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
                    })
                this._enrollmentService.onTableLoaderChanged.next(false)
            }
            , 200);

    }

    adminEnroll(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();
        this._enrollmentService.onTableLoaderChanged.next(true);

        forkJoin([
            this._enrollmentService.getDirectProcessesForSettings(AppConst.appStart.ENROLLMENT.NAME, item.id)
        ]).pipe(
            takeUntil(this._unsubscribeAll),
            finalize(() => setTimeout(() => {
                this._enrollmentService.onTableLoaderChanged.next(false);
            }, 200))
        ).subscribe(
            ([settings]) => {
                const alerggies = this._enrollmentService.onAllergyChanged.value;
                if (_.isEmpty(alerggies?.allergyTypes) || _.isEmpty(settings)) {
                    return;
                }

                this.dialogRef = this._matDialog
                    .open(EditEnrolmentComponent,
                        {
                            panelClass: 'enrolment-edit-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                response: {
                                    allergyTypes: alerggies.allergyTypes,
                                    enrolitem: item,
                                    settings: settings,
                                    countriesList: this.countriesList,
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
                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
                    });
            });
    }


    /**
     * Send wait list item
     *
     * @param {Invitation} item
     * @param {MouseEvent} e
     */
    sendWaitlist(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.CONFIRM_WAITLIST_EMAIL.TITLE,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'primary',
                    nzOnOk: () => {

                        return new Promise((resolve, reject) => {
                            this._enrollmentService
                                .sendWaitlist(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => this._notification.displaySnackBar('Successfully Sent', NotifyType.SUCCESS), 200);
                                        this.ngOnInit();
                                    },
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    print(item: WaitlistEnrollment, e: MouseEvent): void {
        e.preventDefault();
        this._enrollmentService.printCRM(item, this.countriesList, 'open');
    }

}

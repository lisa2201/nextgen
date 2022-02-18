import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { CertificateOrDetermination } from '../certificate-or-determination.model';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from '../../../../../shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { MatDialog } from '@angular/material/dialog';
import { AccsService } from '../accs.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '../../../../../../@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from '../../../../../shared/AppConst';
import { NotifyType } from '../../../../../shared/enum/notify-type.enum';
import { NewOrEditCertificateComponent } from '../dialogs/new-or-edit-certificate/new-or-edit-certificate.component';
import { Child } from '../../child.model';
import { browserRefresh } from '../../../../../app.component';
import { ChildrenService } from '../../services/children.service';
import { NewOrEditDeterminationComponent } from '../dialogs/new-or-edit-determination/new-or-edit-determination.component';
import { ChildNoLongerAtRiskComponent } from '../dialogs/child-no-longer-at-risk/child-no-longer-at-risk';
import { CancelCertificateComponent } from '../dialogs/cancel-certificate/cancel-certificate';
import { ChildService } from '../../services/child.service';
import * as _ from 'lodash';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'accs-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ListViewComponent implements OnInit, OnDestroy {
    private _unsubscribeAll: Subject<any>;

    certificateORDetermination: CertificateOrDetermination[];
    buttonLoader: boolean;
    dialogRef: any;
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    searchInput: FormControl;
    confirmModal: any;
    child: Child;
    ApiData: any[];
    statusMessages: any;
    isLoading: boolean;
    singleCertificate: CertificateOrDetermination;
    constructor(
        private _logger: NGXLogger,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
        private _accsService: AccsService,
        private _modalService: NzModalService,
        private _childService: ChildService,
        private _childrenService: ChildrenService,
        private _route: ActivatedRoute
    ) {

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;

        this.child = null;
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;
        this.isLoading = false;
        // this.pageSize = this._accsService.defaultPageSize;
        // this.pageIndex = this._accsService.defaultPageIndex;
        // this.pageSizeOptions = this._accsService.defaultPageSizeOptions;
        this.searchInput = new FormControl({ value: null, disabled: false });
        this.statusMessages = [
            { key: 'APPROV', value: 'APPROVED' },
            { key: 'CANCEL', value: 'CANCELLED' },
            { key: 'INEFF', value: 'INEFFECTIVE' },
            { key: 'REJECT', value: 'REJECTED' },
            { key: 'REVOKE', value: 'REVOCATION' }
        ];

    }

    ngOnInit(): void {

        this._childService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: Child) => {
                this._logger.debug('[child]', child);

                if (_.isEmpty(child)) {
                    this.child = null;
                } else {

                    this.child = child;
    
                    if (child) {
    
                        // when browser refreshed set selected child manually
                        if (browserRefresh) {
                            this._childrenService.currentChild = child;
                        }
                    }

                }

            });

        this._accsService
            .onACCSChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                // this._logger.debug('[certificates or determinations]', response);

                this.certificateORDetermination = response.items;
                this.ApiData = response.apiData;
                this._logger.debug('[api data]', response.apiData);
                this._logger.debug(['model api data'], this.ApiData);
                // this.total = response.totalDisplay;

            });

        this._accsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.isLoading = value;
                this.tableLoading = value;

                this.searchInput[value ? 'disable' : 'enable']();
            });

        // this._logger.debug('[api data]', this.ApiData);
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    editCertificateDialog(item: CertificateOrDetermination, e: MouseEvent): void {
        e.preventDefault();
        if (item.certificateID) {
            // tslint:disable-next-line: deprecation
            this.isLoading = true;
            this._accsService.getCertificateByID(item.certificateID)
                .pipe(
                    takeUntil(this._unsubscribeAll),

                    finalize(() => setTimeout(() => this.isLoading = false, 200))
                )
                .subscribe(
                    (response: any) => {
                        // restructure API data so that it can be displayed in the form.
                        if (!response.item) {
                            this._notification.displaySnackBar('Error getting Data from API', NotifyType.ERROR);
                            this.isLoading = false;
                            return;
                        }
                        response.item.certificateOrDeterminationApiData = item;
                        response.item.stateTerritoryData = item.StateTerritory;
                        this.dialogRef = this._matDialog
                            .open(NewOrEditCertificateComponent,
                                {
                                    panelClass: 'app-new-or-edit-certificate',
                                    closeOnNavigation: true,
                                    disableClose: true,
                                    autoFocus: false,
                                    data: {
                                        action: AppConst.modalActionTypes.EDIT,
                                        response: {
                                            child: this.child,
                                            certificate: response.item,
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

                                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                            });
                    },
                    error => {
                        throw error;
                    }
                );




            // restructure API data so that it can be displayed in the form.
            item.certificateOrDeterminationApiData = item;
            item.stateTerritoryData = item.StateTerritory;
            return null;

        }
        else {
            // restructure DB data to view the State territory data and state territory document
            item.stateTerritoryData = (item.stateTerritoryData) ? item.stateTerritoryData.StateTerritory : null;
        }
        
        this.dialogRef = this._matDialog
            .open(NewOrEditCertificateComponent,
                {
                    panelClass: 'app-new-or-edit-certificate',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        response: {
                            child: this.child,
                            certificate: item
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

                // setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
            });


    }

    editDeterminationDialog(item: CertificateOrDetermination, e: MouseEvent): void {
        e.preventDefault();
        if (item.determinationID) {
            // tslint:disable-next-line: deprecation
            this.isLoading = true;
            this._accsService.getDeterminationByID(item.determinationID)
                .pipe(
                    takeUntil(this._unsubscribeAll),

                    finalize(() => setTimeout(() => this.isLoading = false, 200))
                )
                .subscribe(
                    (response: any) => {
                        // restructure API data so that it can be displayed in the form.
                        if (!response.item) {
                            this._notification.displaySnackBar('Error getting Data from API', NotifyType.ERROR);
                            this.isLoading = false;
                            return;
                        }
                        // response.item.certificateOrDeterminationApiData = item;
                        response.item.stateTerritoryData = item.StateTerritory;
                        this.dialogRef = this._matDialog
                            .open(NewOrEditDeterminationComponent,
                                {
                                    panelClass: 'app-new-or-edit-determination',
                                    closeOnNavigation: true,
                                    disableClose: true,
                                    autoFocus: false,
                                    data: {
                                        action: AppConst.modalActionTypes.EDIT,
                                        response: {
                                            child: this.child,
                                            determination: response.item,
                                            linkedCertificates: this.ApiData,
                                            fromAPI: true,
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

                                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                            });
                    },
                    error => {
                        throw error;
                    }
                );


            // restructure API data so that it can be displayed in the form.
            item.certificateOrDeterminationApiData = item;
            item.stateTerritoryData = item.StateTerritory;
            return null;

        }
        else {
            // restructure DB data to view the State territory data and state territory document
            item.stateTerritoryData = (item.stateTerritoryData) ? item.stateTerritoryData.StateTerritory : null;
        }
        this.dialogRef = this._matDialog
            .open(NewOrEditDeterminationComponent,
                {
                    panelClass: 'app-new-or-edit-determination',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        response: {
                            child: this.child,
                            determination: item,
                            linkedCertificates: this.ApiData,
                            fromAPI: false,
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

                // setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
            });

    }

    childNoLongerAtRiskCertificate(item: CertificateOrDetermination, e: MouseEvent): void {
        e.preventDefault();

        // restructure API data so that it can be displayed in the form.
        item.certificateOrDeterminationApiData = item;
        item.stateTerritoryData = item.StateTerritory;

        this.dialogRef = this._matDialog
            .open(ChildNoLongerAtRiskComponent,
                {
                    panelClass: 'accs-child-no-longer-at-risk',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {
                            child: this.child,
                            certificateOrDetermination: item
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

                // setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
            });
    }


    childNoLongerAtRiskDetermination(item: CertificateOrDetermination, e: MouseEvent): void {
        e.preventDefault();

        // restructure API data so that it can be displayed in the form.
        item.certificateOrDeterminationApiData = item;
        item.stateTerritoryData = item.StateTerritory;

        this.dialogRef = this._matDialog
            .open(ChildNoLongerAtRiskComponent,
                {
                    panelClass: 'accs-child-no-longer-at-risk',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {
                            child: this.child,
                            certificateOrDetermination: item
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

                // setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
            });
    }

    cancelCertificate(item: CertificateOrDetermination, e: MouseEvent): void {
        // item.certificateOrDeterminationApiData = item;
        // item.stateTerritoryData = item.StateTerritory;


        this.dialogRef = this._matDialog
            .open(CancelCertificateComponent,
                {
                    panelClass: 'accs-cancel-certificate',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: {
                            child: this.child,
                            determination: item
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

                // setTimeout(() => this._notification.displaySnackBar('Successfully Updated', NotifyType.SUCCESS), 200);
            });
    }

    cancelDetermination(item: CertificateOrDetermination, e: MouseEvent): void {
        alert('Coming Soon');
    }

    deleteCertificate(item: CertificateOrDetermination, e: MouseEvent): void {
        this.confirmModal = this._modalService.create({
            nzTitle: 'Confirm',
            nzContent: 'Are you Sure you want to delete this? This action is not reversible',
            nzFooter: '',
            nzMaskClosable: false,
            nzClosable: false,
            nzOnOk: () => {
                return new Promise((resolve, reject) => {
                    this._accsService.deleteCertificate(item)
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            finalize(() => resolve())
                        )
                        .subscribe(
                            message => {
                                setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                            },
                            error => {
                                throw error;
                            }
                        );
                });
            }
        });
    }

    clearSearch($event: MouseEvent): void {

    }

    reloadTable(): void {
        this._accsService.getDetermination(this._route.snapshot.paramMap.get('id'));
    }

    getStatus(value): string {

        if (value) {
            return AppConst.ACCSRecordStatusMap[value];
        } else {
            return 'N/A';
        }

    }

}

import { Component, OnInit, OnDestroy, ViewEncapsulation, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntil, finalize, debounceTime, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { forkJoin, Subject } from 'rxjs';

import * as _ from 'lodash';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NzModalService, NzModalRef } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { MediaObserver } from '@angular/flex-layout';

import { AuthService } from 'app/shared/service/auth.service';
import { FeesService } from '../service/fees.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

import { CcsSetup } from 'app/main/modules/ccs-setup/ccs-setup.model';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { Fee } from '../model/fee.model';
import { AuthClient } from 'app/shared/model/authClient';

import { FeeNewOrEditComponent } from '../dialog/fee-new-or-edit/fee-new-or-edit.component';

@Component({
    selector: 'fees-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FeesListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    pageIndex: any;
    pageSize: any;
    dialogRef: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    feesList: Fee[];
    confirmModal: NzModalRef;
    client: AuthClient;

    mapOfSort: { [key: string]: any } = {
        email: null,
        branch: null,
        expires: null
    };

    filterValue: any = null;
    searchInput: FormControl;
    
    isLoadingData: boolean;
    buttonLoader: boolean;

    @Input() isCreateButtonLoading: boolean;

    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _feesService: FeesService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    ) {

        this.client = this._authService.getClient();
        this.pageSizeChanger = true;
        this.buttonLoader = false;
        this.mobilePagination = false;
        this.pageSize = this._feesService.defaultPageSize;
        this.pageIndex = this._feesService.defaultPageIndex;
        this.pageSizeOptions = this._feesService.defaultPageSizeOptions;

        this.tableLoading = false;
        this.isLoadingData = false;
        this.searchInput = new FormControl({ value: null, disabled: false });

        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void 
    {
        this._logger.debug('fees !!!');
        
        this._feesService.onFeesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((fees: any) => {
                this._logger.debug('fees !!!', fees);
                this.feesList = fees.feeList;
                this.total = fees.totalDisplay;
            });

        this._feesService.onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
                this.searchInput[value ? 'disable' : 'enable']();
            });

        this.searchInput.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(searchText => {
                this._logger.debug('[search change]', searchText);

                if (!_.isNull(searchText)) {
                    this._feesService.onSearchTextChanged.next(searchText);
                }
            });
    }

    ngOnDestroy(): void {
        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    delete(item: Fee, e: MouseEvent): void {
        e.preventDefault();
        // this.tableLoading = true;
        this.confirmModal = this._modalService.confirm({
            nzTitle: AppConst.dialogContent.DELETE.TITLE,
            nzContent: AppConst.dialogContent.DELETE.BODY,
            nzWrapClassName: 'vertical-center-modal',
            nzOkText: 'Yes',
            nzOkType: 'danger',
            nzOnOk: () => {
                return new Promise((resolve, reject) => {
                    this._feesService
                        .deleteFee(item.id)
                        .pipe(
                            takeUntil(this._unsubscribeAll),
                            finalize(() => resolve())
                        )
                        .subscribe(
                            message =>
                                setTimeout(
                                    () =>
                                        this._notification.displaySnackBar(
                                            message,
                                            NotifyType.SUCCESS
                                        ),
                                    200
                                ),
                            error => {
                                throw error;
                            }
                        );
                });
            }
        });
    }

    showData(item: Fee, e: MouseEvent): void {
        e.preventDefault();
        this.tableLoading = true;

        this._feesService
            .getAdjustedList(item.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                    setTimeout(() => (this.tableLoading = false), 200)
                )
            )

            .subscribe(depends => 
            {
                this.dialogRef = this._matDialog.open(FeeNewOrEditComponent, {
                    panelClass: 'fee-new-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: 'ShowData',
                        list: depends,
                        item: item
                    }
                });

                this.dialogRef.afterClosed().subscribe(message => {
                    if (!message) {
                        return;
                    }

                    this._notification.clearSnackBar();

                    setTimeout(
                        () =>
                            this._notification.displaySnackBar(
                                message,
                                NotifyType.SUCCESS
                            ),
                        200
                    );
                });
            });
    }

    resetSort(): void {
        for (const key in this.mapOfSort) { this.mapOfSort[key] = null; }
    }

    clearSearch(e: MouseEvent): void {
        e.preventDefault();

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: true });
        this.isLoadingData = true;
    }

    onTableChange(reset: boolean = false): void
    {
        if (reset)
        {
            this.pageIndex = this._feesService.defaultPageIndex;
        }

        this._feesService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    editDialog(fee: Fee, e: MouseEvent, mode: string): void 
    {
        e.preventDefault();

        if (this.tableLoading || this.isCreateButtonLoading)
        {
            return;
        }

        this.tableLoading = true;

        forkJoin([
            this._feesService.getDependency(),
            this._feesService.getFee(fee.id)
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this.tableLoading = false, 200))
            )
            .subscribe(
                ([response, feeItem]) =>
                {
                    this.dialogRef = this._matDialog
                        .open(FeeNewOrEditComponent,
                        {
                            panelClass: 'fee-new-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: mode === 'EDIT' ? AppConst.modalActionTypes.EDIT : mode,
                                rooms: response,
                                fee: feeItem
                            }
                        });
                        
                    this.dialogRef
                        .afterClosed()
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe(message =>
                        {   
                            if ( !message )
                            {
                                return;
                            }

                            this._notification.clearSnackBar();
            
                            setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        });
                },
                error =>
                {
                    throw error;
                }
            );
    }

    setStatus(item: Fee, e: MouseEvent): void {
        e.preventDefault();

        this.tableLoading = true;

        const sendObj = {
            id: item.id,
            status: item.status
        };

        this._feesService
            .updateStatus(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                shareReplay(),
                finalize(() => {
                    setTimeout(() => {
                        this.tableLoading = false;
                    }, 250);
                })
            )
            .subscribe(
                message =>
                    setTimeout(
                        () =>
                            this._notification.displaySnackBar(
                                message,
                                NotifyType.SUCCESS
                            ),
                        200
                    ),
                error => {
                    throw error;
                }
            );
    }
}

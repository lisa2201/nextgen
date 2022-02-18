import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { forkJoin, Subject } from 'rxjs';

import * as _ from 'lodash';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { MatDialog } from '@angular/material/dialog';
import { MediaObserver } from '@angular/flex-layout';

import { OrganizationService } from '../services/organization.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { MarketPlaceService } from '../../../common/public/market-place/services/market-place.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

import { Organization } from '../Models/organization.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';

import { AdditionalDetailsComponent } from '../dialogs/additional-details/additional-details.component';

export interface Select {
    id: string;
}

@Component({
    selector: 'app-list-view',
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

    // Private
    private _unsubscribeAll: Subject<any>;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    approveLoading: boolean;
    deleteLoading: boolean;

    organizationList: Organization[];
    pageSizeOptions: number[];

    mapOfSort = {
        email: null,
        company_name: null,
        no_of_branches: null,
        cdate: null
    };

    filterValue: any = null;
    searchInput: FormControl;
    dialogRef: any;
    confirmModal: NzModalRef;

    isAllDisplayDataChecked = false;
    isOperating = false;
    isIndeterminate = false;
    listOfDisplayData: Organization[] = [];
    mapOfCheckedId: { [key: string]: boolean } = {};
    mapOfId: { [key: string]: boolean } = {};
    numberOfChecked = 0;
    numberOf = 0;

    loading = false;

    buttonLoader: boolean;

    @Output()
    updateTableScroll: EventEmitter<any>;


    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _organizationService: OrganizationService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver,
        private _addonService: MarketPlaceService
    ) 
    {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._organizationService.defaultPageSize;
        this.pageIndex = this._organizationService.defaultPageIndex;
        this.pageSizeOptions = this._organizationService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();
        
        this.approveLoading = false;
        this.deleteLoading = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On Init
     */
    ngOnInit(): void 
    {
        this._logger.debug('organization list view!!!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to organization changes
        this._organizationService
            .onOrganizationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => 
            {
                this._logger.debug('[organizations]', response);

                this.organizationList = response.items;
                this.total = response.total;

                this.searchInput[(response.total < 1 || (response.filtered && response.totalDisplay < 1)) ? 'disable' : 'enable']({ emitEvent: false });

                  // reset search
                  if (response.total < 1 || (response.filtered && response.totalDisplay < 1)) { this.resetSearch(); }

                this.updateTableScroll.next();
            });

        // Subscribe to search input changes
        this.searchInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(searchText => 
            {
                this._logger.debug('[search change]', searchText);

                if (!_.isNull(searchText)) 
                {
                    this._organizationService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._organizationService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;

                this.searchInput[value ? 'disable' : 'enable']();
            });

        // Subscribe to filter changes
        this._organizationService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                // reset page index
                this.pageIndex = this._organizationService.defaultPageIndex;
            });
    }


    /**
     * On Destroy
     */
    ngOnDestroy(): void 
    {
        // Close all dialogs
        this._matDialog.closeAll();

        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }

        this.updateTableScroll.unsubscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * track
     * @param index 
     * @param item 
     */
    trackByFn(index: number, item: any): number 
    {
        return index;
    }

    /**
     * Sort Columns
     * @param {string} sortName 
     * @param {string} sortValue 
     */
    sortColumns(sortName: string, sortValue: string): void 
    {
        if (this.total < 1) {
            setTimeout(() => this.resetSort(), 0);

            return;
        }

        for (const key in this.mapOfSort) {
            this.mapOfSort[key] = (key === sortName) ? sortValue : null;
        }

        this._organizationService.onSortChanged.next({
            key: sortName,
            value: sortValue
        });
    }

    /**
     * Reset Sort
     */
    resetSort(): void {
        for (const key in this.mapOfSort) { this.mapOfSort[key] = null; }
    }

    /**
     * clear search 
     *
     * @param {MouseEvent} e
     */
    clearSearch(e: MouseEvent): void {
        e.preventDefault();

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: true });
    }

    /**
     * clear search and sort
     *
     * @param {boolean} [updateView=false]
     */
    resetSearch(updateView: boolean = false): void
    {
        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: false });

        if (updateView)
        {
            this._organizationService.onSearchTextChanged.next(this.searchInput.value);
        }
    }

    /**
     * On Table Change 
     * @param {boolean} reset 
     */
    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._organizationService.defaultPageIndex;
        }

        this._organizationService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * Toggle Sidebar
     * @param {string} name 
     */
    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * Delete organization
     * @param {Organization} item 
     * @param {MouseEvent} e 
     */
    delete(item: Organization, e: MouseEvent): void {
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

                            this.deleteLoading = true;

                            this._organizationService
                                .deleteOrganization(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => {
                                        this.deleteLoading = false;
                                        resolve();
                                    })
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        this.onTableChange(true);
                                    }
                                );
                        });
                    }
                }
            );
    }

    /**
     * Check All
     * @param {boolean} value 
     */
    checkAll(value: boolean): void {
        this.listOfDisplayData.forEach(item => (this.mapOfCheckedId[item.id] = value));
        this.refreshStatus();
    }

    /**
     * Page Data Change
     * @param {Organization} $event 
     */
    currentPageDataChange($event: Organization[]): void {
        this.listOfDisplayData = $event;
        this.refreshStatus();
    }

    /**
     * Status refresh
     */
    refreshStatus(): void {
        this.isAllDisplayDataChecked = this.listOfDisplayData
            .every(item => this.mapOfCheckedId[item.id]);
        this.isIndeterminate =
            this.listOfDisplayData.some(item => this.mapOfCheckedId[item.id]) &&
            !this.isAllDisplayDataChecked;
        this.numberOfChecked = this.organizationList.filter(item => this.mapOfCheckedId[item.id]).length;

        // const data = JSON.stringify(this.mapOfCheckedId);
        console.log(this.mapOfCheckedId);

        const sendObj = {
            indexs: _.keys(_.pickBy(this.mapOfCheckedId, (val) => val === true))
        };

        this.numberOf = sendObj.indexs.length;
    }

    /**
     * Approve Email
     */
    approveEmail(): void 
    {
        this.approveLoading = true;

        const sendObj = {
            indexs: _.keys(_.pickBy(this.mapOfCheckedId, (val) => val === true))
        };

        this._organizationService.approveOrganization(sendObj)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.approveLoading = false;
                })
            )
            .subscribe(
                message => {
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                    this.checkAll(false);
                    this.onTableChange(true);
                }
            );

    }

    /**
     * Approve Single
     * @param {Organization} item 
     * @param {MouseEvent} e 
     */
    approveSingle(item: Organization, e: MouseEvent, standard: boolean): void 
    {
        e.preventDefault();

        this.mapOfId = { [item.id]: true };

        const sendObj = {
            indexs: [item.id]
        };

        if (standard === true) {

            this.tableLoading = true;

            this._organizationService.approveOrganization(sendObj)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() => {
                        this.tableLoading = false;
                    })
                )
                .subscribe(
                    message => {
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                        // this.checkAll(false);
                        this.onTableChange(true);
                    }
                );
            console.log('Approved the Fixed plan!');

        } else {
            this.addQuoteDialog(item, e);
            console.log('Dialog for additional details!');
        }
    }

    /**
     * Delete multiple fields
     * @param e 
     */
    deleteMultiple(e: MouseEvent): void 
    {
        e.preventDefault();

        const sendObj = {
            indexs: _.keys(_.pickBy(this.mapOfCheckedId, (val) => val === true))
        };
        this.numberOf = sendObj.indexs.length;
        // return console.log(sendObj);

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: 'Are you sure want to delete these ' + this.numberOf + ' Items?',
                    nzContent: AppConst.dialogContent.DELETE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => {
                        return new Promise((resolve, reject) => {
                            this._organizationService
                                .multiDelete(sendObj)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                                        this.checkAll(false);
                                        this.onTableChange(true);
                                    },
                                    error => {
                                        // throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    /**
       * edit quotation
       * @param item 
       * @param e 
       */
    editQuoteDialog(item: Organization, e: MouseEvent): void 
    {
        e.preventDefault();

        this._organizationService.onTableLoaderChanged.next(true);

        // this._organizationService.getDependency(),


        forkJoin([
            this._organizationService.getOrganization(item.id),
            this._organizationService.getQuotationInfo(item.id),
            this._addonService.getAddons()
        ])


            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this._organizationService.onTableLoaderChanged.next(false), 200))
            )
            .subscribe(
                ([organization, quote, addon]) => {

                    this.dialogRef = this._matDialog
                        .open(AdditionalDetailsComponent,
                            {
                                panelClass: 'additional-details-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.EDIT,
                                    response: {
                                        organization: organization,
                                        quote: quote,
                                        addon: addon
                                    }
                                }
                            });

                    this.dialogRef
                        .afterClosed()
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
    }

    /**
     * add quotation details
     * @param item 
     * @param e 
     */
    addQuoteDialog(item: Organization, e: MouseEvent): void 
    {
        e.preventDefault();

        this._organizationService.onTableLoaderChanged.next(true);

        // this._organizationService.getDependency(),


        forkJoin([
            this._organizationService.getOrganization(item.id),
            this._organizationService.getQuotationInfo(item.id),
            this._addonService.getAddons()
        ])


            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => this._organizationService.onTableLoaderChanged.next(false), 200))
            )
            .subscribe(
                ([organization, quote, addon]) => {

                    if (quote.length === 0) {
                        return;
                    }

                    this.dialogRef = this._matDialog
                        .open(AdditionalDetailsComponent,
                            {
                                panelClass: 'additional-details-dialog',
                                closeOnNavigation: true,
                                disableClose: true,
                                autoFocus: false,
                                data: {
                                    action: AppConst.modalActionTypes.NEW,
                                    response: {
                                        organization: organization,
                                        quote: quote,
                                        addon: addon
                                    }
                                }
                            });

                    this.dialogRef
                        .afterClosed()
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
    }
}


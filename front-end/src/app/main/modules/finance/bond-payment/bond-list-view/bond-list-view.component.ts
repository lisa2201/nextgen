import { Component, OnInit, ViewEncapsulation, OnDestroy, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { NGXLogger } from 'ngx-logger';
import { BondPayment } from '../model/bond-payment.model';
import { BondPaymentservice } from '../service/bond-payment.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs/internal/Subject';
import { FormControl } from '@angular/forms';
import * as _ from 'lodash';
import { debounceTime } from 'rxjs/internal/operators/debounceTime';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { AppConst } from 'app/shared/AppConst';
import { finalize } from 'rxjs/internal/operators/finalize';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NewOrEditBondPaymentComponent } from '../dialog/new-or-edit-bond-payment/new-or-edit-bond-payment.component';
import { User } from 'app/main/modules/user/user.model';
import { MatDialog } from '@angular/material/dialog';
import { MediaObserver, MediaChange } from '@angular/flex-layout';

@Component({
    selector: 'bond-payment-list-view',
    templateUrl: './bond-list-view.component.html',
    styleUrls: ['./bond-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BondListViewComponent implements OnInit, OnDestroy {

    bondList: BondPayment[];
    tableLoading: boolean;
    buttonLoader: boolean;
    searchInput: FormControl;
    filterValue: any = null;
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    mobilePagination: boolean;
    confirmModal: NzModalRef;
    dialogRef: any;

    @Output()
    updateTableScroll: EventEmitter<any>;
    private _unsubscribeAll: Subject<any>;
    constructor(
        private _fuseSidebarService: FuseSidebarService,
        private _logger: NGXLogger,
        private _mediaObserver: MediaObserver,
        private _bonPaymentService: BondPaymentservice,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
    ) 
    {
        this.pageSizeChanger = true;
        this.buttonLoader = false;
        this.mobilePagination = false;
        this.pageSize = this._bonPaymentService.defaultPageSize;
        this.pageIndex = this._bonPaymentService.defaultPageIndex;
        this.pageSizeOptions = this._bonPaymentService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });
        this.bondList = [];
        this.tableLoading = false;
        this._unsubscribeAll = new Subject();
        this.updateTableScroll = new EventEmitter();
    }

    ngOnInit() {

        this._logger.debug('bond !!!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to branch changes
        this._bonPaymentService
            .onBondChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response) => {
                this._logger.debug('[bond]', response);

                this.bondList = response.items;
                this.total = response.totalDisplay;

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
                this._bonPaymentService.onSearchTextChanged.next(searchText);
            }
        });

    // Subscribe to table loader changes
    this._bonPaymentService
        .onTableLoaderChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(value =>
        {
            this._logger.debug('[table loader]', value);

            this.tableLoading = value;
        });

    // Subscribe to filter changes
    this._bonPaymentService
        .onFilterChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((filter) =>
        {
            this.filterValue = filter;

            // reset page index
            this.pageIndex = this._bonPaymentService.defaultPageIndex;
        });

    }


    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    ngOnDestroy(): void {
        this.updateTableScroll.unsubscribe();
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._bonPaymentService.unsubscribeOptions();


    }

    clearSearch(e: MouseEvent): void
    {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.resetSearch(true);
        this._bonPaymentService.onSearchTextChanged.next(null);
    }

    currentPageDataChange(data: BondPayment[]): void {
        // setTimeout(() => this.refreshStatus(), 300);
    }

    resetSearch(updateView: boolean = true): void
    {

        this.searchInput.patchValue('', { emitEvent: false });

        // if (updateView)
        // {
        //     this._bonPaymentService.onSearchTextChanged.next(this.searchInput.value);
        // }
    }

    onTableChange(reset: boolean = false): void
    {
        if (reset)
        {
            this.pageIndex = this._bonPaymentService.defaultPageIndex;
        }

        this._bonPaymentService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    delete(item: BondPayment, e: MouseEvent): void
    {
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
                        return new Promise((resolve, reject) =>
                        {
                            this._bonPaymentService
                                .deleteBond(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message =>
                                    {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        this.onTableChange(true);
                                    },
                                    error =>
                                    {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );
    }

    editDialog(item: BondPayment, e: MouseEvent): void {
        e.preventDefault();

        // this.buttonLoader = true;
        this.tableLoading = true;
        Promise.all([
            this._bonPaymentService.getUsers(),
            this._bonPaymentService.getChildren(),
        ])
        .then(([user, childList]: [User[], any]) => 
        {
            console.log('[user-list]', user);
            console.log('[child]', childList);

        setTimeout(() => this.tableLoading = false, 200);
        this.dialogRef = this._matDialog
            .open(NewOrEditBondPaymentComponent,
                {
                    panelClass: 'new-or-edit-bond-payment',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        response: {
                            bond: item,
                            user: user,
                            child: childList
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

                // update view
                // this.tableContentView.onTableChange(true);
            });
        });
    }

    /**
     * Reload table
     */
    reloadTable(): void {
        this.onTableChange(false);
    }

}

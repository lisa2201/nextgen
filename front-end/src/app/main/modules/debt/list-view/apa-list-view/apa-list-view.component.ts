import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, combineLatest, forkJoin } from 'rxjs';
import { FormControl } from '@angular/forms';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { InvitationService } from 'app/main/modules/invitation/services/invitation.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { Invitation } from 'app/main/modules/invitation/invitation.model';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { DebtService } from '../../services/debt.service';
import { ApaNewOrEditComponent } from '../../apa-new-or-edit/apa-new-or-edit.component';
import { AlternativePayment } from '../../alternative-payment.model';
import { AccountManagerService } from 'app/main/modules/account-manager/account-manager.service';

@Component({
    selector: 'apa-list-view',
    templateUrl: './apa-list-view.component.html',
    styleUrls: ['./apa-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})

export class ApaListViewComponent implements OnInit, OnDestroy {
    // Private
    private _unsubscribeAll: Subject<any>;

    apaList: any;

    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;

    filterValue: any = null;

    searchInput: FormControl;

    dialogRef: any;
    confirmModal: NzModalRef;

    @Output()
    updateTableScroll: EventEmitter<any>;
    apiData: any;
    tableData: any;

    /**
     * Constructor
     *
     * @param {AuthService} _authService
     * @param {NGXLogger} _logger
     * @param {MatDialog} _matDialog
     * @param {DebtService} _debtService
     * @param {NotificationService} _notification
     * @param {NzModalService} _modalService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {MediaObserver} _mediaObserver
     */
    constructor(
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _debtService: DebtService,
        private _notification: NotificationService,
        private _fuseSidebarService: FuseSidebarService,
        private _accountManagerService: AccountManagerService
    ) {
        // set default values
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

        this.pageSize = this._debtService.defaultPageSize;
        this.pageIndex = this._debtService.defaultPageIndex;
        this.pageSizeOptions = this._debtService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll = new EventEmitter();

        // Set the private defaults
        this._unsubscribeAll = new Subject();

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('alternative payment list view!!!');

        // Subscribe to invitation list changes
        this._debtService
            .onAlternativePaymentChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {

                this.apaList = response?.items || [];
                this.apiData = response.apiData || null;
                this.tableData = (response.items === '') ? (response?.apiData?.results || []) : (response?.items || []);               
                this._logger.debug('[alternative payment]', this.apaList);
                this._logger.debug('[apiData-->]', this.apiData);


            });

        // Subscribe to search input changes
        this.searchInput
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe(searchText => {
                this._logger.debug('[search change]', searchText);

                if (!_.isNull(searchText)) {
                    this._debtService.onSearchTextChanged.next(searchText);
                }
            });

        // Subscribe to table loader changes
        this._debtService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._debtService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._debtService.defaultPageIndex;
            });

        setTimeout(() => {
            this._debtService.getAlternativePayments();
        }, 300);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this.updateTableScroll.unsubscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number {
        return index;
    }

    /**
     * clear search
     *
     * @param {MouseEvent} e
     */
    clearSearch(e: MouseEvent, _emit: boolean = true): void {
        if (!_.isNull(e)) { e.preventDefault(); }


        this.searchInput.patchValue('', { emitEvent: _emit });
    }

    /**
     * get items for table
     *
     * @param {boolean} [reset=false]
     */
    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._debtService.defaultPageIndex;
        }

        this._debtService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * Toggle sidebar
     *
     * @param name
     */
    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * New Alternative Payment Arrangement
     *
         * @param {MouseEvent} e
     */
    addDialog(e: MouseEvent): void {
        e.preventDefault();

        if (this._authService.isOwner()) {
            
            const _component: any = ApaNewOrEditComponent;
            const _componentClass: any = 'apa-new-or-edit-dialog';

            forkJoin(
                this._accountManagerService.getCcsProviders()
            ).subscribe(([providers]) => {

                this.dialogRef = this._matDialog
                    .open(_component,
                        {
                            panelClass: _componentClass,
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                providers: providers,
                                response: {
                                    item:''
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

            });
    
        }

    }

    /**
     * Edit Alternative Payment Arrangement
     *
     */
    edit(item:AlternativePayment): void {

        if (this._authService.isOwner()) {
            
            const _component: any = ApaNewOrEditComponent;
            const _componentClass: any = 'apa-new-or-edit-dialog';

            forkJoin(
                this._accountManagerService.getCcsProviders()
            ).subscribe(([providers]) => {

                this.dialogRef = this._matDialog
                    .open(_component,
                        {
                            panelClass: _componentClass,
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.EDIT,
                                providers: providers,
                                response: {
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

                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                    });
    
            });

        }

    }

    /**
     * Edit API Data
     *
     */
    editApiData(item): void {


        if (this._authService.isOwner()) {
            
            const _component: any = ApaNewOrEditComponent;
            const _componentClass: any = 'apa-new-or-edit-dialog';

            forkJoin(
                this._accountManagerService.getCcsProviders()
            ).subscribe(([providers]) => {

                this.dialogRef = this._matDialog
                    .open(_component,
                        {
                            panelClass: _componentClass,
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: 'EDIT-API',
                                providers: providers,
                                response: {
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
        
                        this._notification.clearSnackBar();
        
                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
        
                    });

            });

        }

    }


}
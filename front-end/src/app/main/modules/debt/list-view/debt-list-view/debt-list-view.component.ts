import { Component, OnInit, Output, EventEmitter, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { Invitation } from '../../../invitation/invitation.model';
import { FormControl } from '@angular/forms';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import * as _ from 'lodash';
import { InvitationAddOrEditDialogComponent } from '../../../invitation/dialogs/new-or-edit/new-or-edit.component';
import { InvitationSingleNewOrEditComponent } from '../../../invitation/dialogs/single-new-or-edit/single-new-or-edit.component';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DebtService } from '../../services/debt.service';

@Component({
    selector: 'debt-list-view',
    templateUrl: './debt-list-view.component.html',
    styleUrls: ['./debt-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class DebtListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    debtList: any[];

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

    debtStatus: any[];

    @Output()
    updateTableScroll: EventEmitter<any>;
    branchDetails: any;
    returnStatus: any;

    constructor(
        private _logger: NGXLogger,
        private _debtService: DebtService,
        private _fuseSidebarService: FuseSidebarService,
        private _auth: AuthService
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

        // this.branchDetails = this._auth.getClient();

        // console.log('==========>', this.branchDetails);

        this.debtStatus = [
            {code: 'DET', label: 'Determined'},
            {code: 'PAJ', label: 'Pending Adjustment'},
            {code: 'PFD', label: 'Pending Finalised No Debt'},
            {code: 'DWO', label: 'Determined Written-off'},
            {code: 'DMC', label: 'Referred to Collection Agent'},
            {code: 'PWO', label: 'Pending Write-off'},
            {code: 'PWV', label: 'Pending Waiver'},
            {code: 'PIN', label: 'Pending Interest'},
        ]
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('debt list view!!!');

        // Subscribe to invitation list changes
        this._debtService
            .onDebtListChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {

                this.debtList = response?.items?.results || [];
                this._logger.debug('[data-->]', this.debtList);

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
                    this._debtService.onDebtSearchTextChanged.next(searchText);
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

    getStatus(status: string): string{

        this.returnStatus = this.debtStatus.find(
            (el) => {
                return el.code === status
            }
          );
          
          return this.returnStatus['label'];
    }

}

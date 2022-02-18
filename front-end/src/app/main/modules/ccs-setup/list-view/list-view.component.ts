import { Component, OnInit, OnDestroy, ViewEncapsulation, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { NzModalService } from 'ng-zorro-antd';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { MediaObserver } from '@angular/flex-layout';
import { CcsSetupService } from '../ccs-setup.service';
import { CcsSetup } from '../ccs-setup.model';
import { FormControl } from '@angular/forms';
import * as _ from 'lodash';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import { NewOrEditComponent } from '../dialog/new-or-edit/new-or-edit.component';

@Component({
    selector: 'ccs-list-view',
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


    pageIndex: any;
    pageSize: any;
    dialogRef: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;
    mobilePagination: boolean;
    ccsList: CcsSetup[];

    mapOfSort: { [key: string]: any } = {
        email: null,
        branch: null,
        expires: null
    };

    filterValue: any = null;
    searchInput: FormControl;
    _unsubscribeAll: any;

    @Output()
    updateTableScroll: EventEmitter<any>;

    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _ccsSetupService: CcsSetupService,
        private _notification: NotificationService,
        private _fuseSidebarService: FuseSidebarService,
        private _mediaObserver: MediaObserver
    ) {
        this.pageSizeChanger = true;
        this.tableLoading = false;
        this.mobilePagination = false;

          this.pageSize=this._ccsSetupService.defaultPageSize;
          this.pageIndex=this._ccsSetupService.defaultPageIndex;
          this.pageSizeOptions=this._ccsSetupService.defaultPageSizeOptions;

        this.searchInput = new FormControl({ value: null, disabled: false });

        this.updateTableScroll=new EventEmitter();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this._logger.debug('ccs !!!');

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        this._ccsSetupService
            .onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[ccsdata]', response);
                this.ccsList = response.items;
                this.total = response.totalDisplay;
            });

        this._ccsSetupService.onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

        // Subscribe to filter changes
        this._ccsSetupService
            .onFilterChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((filter) => {
                this.filterValue = filter;

                // reset page index
                this.pageIndex = this._ccsSetupService.defaultPageIndex;
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
                    this._ccsSetupService.onSearchTextChanged.next(searchText);
                }
            });

    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    resetSort(): void {
        for (const key in this.mapOfSort) {
            this.mapOfSort[key] = null;
        }
    }

    /**
     * Track By Function
     * @param {number} index 
     * @param {any} item 
     * @returns {number}
     */
    trackByFn(index: number): number {
        return index;
    }

    /**
     * Table change handler
     * @param {boolean} reset 
     */
    onTableChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._ccsSetupService.defaultPageIndex;
        }

        this._ccsSetupService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    /**
     * Reload table
     */
    reloadTable(): void {
        this.onTableChange(false);
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

        this.resetSort();

        this.searchInput.patchValue('', { emitEvent: _emit });
    }

    editCcs(event: MouseEvent): void {

        event.preventDefault();

    }

    openRefreshModel(item: CcsSetup, e: MouseEvent): void {
        e.preventDefault();
        item.isLoading = true;
        // combineLatest(this._ccsSetupService.getCcsdata(item.id))
        this._ccsSetupService
            .getCcsdata(item.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => (item.isLoading = false), 200))
            )
            .subscribe(
                ccs => {
                    console.log('respondata', ccs);
                    this.dialogRef = this._matDialog.open(NewOrEditComponent, {
                        panelClass: 'ccs-new-dialog',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.EDIT,
                            ccsData: ccs
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
                },
                error => {
                    throw error;
                }
            );
        // alert("ok");
    }
}

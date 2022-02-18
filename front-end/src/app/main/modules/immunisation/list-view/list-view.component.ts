
import { Component, ViewEncapsulation, OnInit, Output, ViewChild, EventEmitter, Input, OnDestroy } from '@angular/core';
import { MediaObserver, MediaChange } from '@angular/flex-layout';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';
import * as _ from 'lodash';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs/internal/Subject';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import { NewImmunisationComponent } from '../dialog/new-immunisation/new-immunisation.component';
import { Immunisation } from '../model/immunisation.model';
import { ImmunisationService } from '../service/immunisation.service';

@Component({
  selector: 'immunisation-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ImmunisationListViewComponent implements OnInit, OnDestroy {

    immunisation: Immunisation[];
    buttonLoader: boolean;
    dialogRef: any;
    updateButtonsTriggered: boolean;
    confirmModal: NzModalRef;
    filterValue: any = null;
    isOwnerView: boolean;

    searchInput: FormControl;
    
    mobilePagination: boolean;
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    total = 0;
    tableLoading: boolean;

    @Input() isCreateButtonLoading: boolean;

    @Output()
    updateTableScroll: EventEmitter<any>;
    
    private _unsubscribeAll: Subject<any>;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;
    
    constructor
        (
        private _logger: NGXLogger,
        private _notification: NotificationService,
        public _matDialog: MatDialog,
        private _immunisationService: ImmunisationService,
        private _mediaObserver: MediaObserver,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _authService: AuthService,
        
        ) 
        {
            this.pageSizeChanger = true;
            this.tableLoading = false;
            this.mobilePagination = false;

            this.pageSize = this._immunisationService.defaultPageSize;
            this.pageIndex = this._immunisationService.defaultPageIndex;
            this.pageSizeOptions = this._immunisationService.defaultPageSizeOptions;

            this.searchInput = new FormControl({ value: null, disabled: false });

            this.updateTableScroll = new EventEmitter();
            this._unsubscribeAll = new Subject();
            this.mobilePagination = false;
            this.isOwnerView = this._authService.isOwner() || this._authService.getUserLevel() === AppConst.roleLevel.ROOT;
        }

  ngOnInit() {

    this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes =>
            {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

            // Subscribe to table loader changes
        this._immunisationService
        .onTableLoaderChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(value =>
        {
            this._logger.debug('[table loader]', value);

            this.tableLoading = value;
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
                 this._immunisationService.onSearchTextChanged.next(searchText);
             }
         });

        this._immunisationService
            .OnImmunisationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[immunisation]', response);
                this.immunisation = response.items;

                this.total = response.totalDisplay;

                this.searchInput[(response.total < 1 || (response.filtered && response.totalDisplay < 1)) ? 'disable' : 'enable']({ emitEvent: false });

                // reset search
                if (response.total < 1 || (response.filtered && response.totalDisplay < 1)) { this.resetSearch(); }

                this.updateTableScroll.next();
            });

        this._immunisationService
            .onImmunisationStatusChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((res: any) =>
            {
                this._logger.debug('[immunisation update status]', res);

                this.immunisation[res.position].setStatus(res.status);
            });
  }

  onTableChange(reset: boolean = false): void
    {
        if (reset)
        {
            this.pageIndex = this._immunisationService.defaultPageIndex;
        }

        this._immunisationService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    resetSearch(updateView: boolean = false): void
    {
        this.searchInput.patchValue('', { emitEvent: false });

        if (updateView)
        {
            this._immunisationService.onSearchTextChanged.next(this.searchInput.value);
        }
    }

    editDialog(item: Immunisation, e: MouseEvent): void
    {
        e.preventDefault();

        if (this.tableLoading)
        {
            return;
        }

        this._immunisationService.onTableLoaderChanged.next(true);

        setTimeout(
            () => (
                this._immunisationService.onTableLoaderChanged.next(false),
                (this.dialogRef = this._matDialog.open(NewImmunisationComponent, {
                    panelClass: 'new-immunisation',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        item: item
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


    delete(item: Immunisation, e: MouseEvent): void
    {
        e.preventDefault();

        if (this.tableLoading)
        {
            return;
        }

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
                            this._immunisationService
                                .deleteImmunisation(item.id)
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

    updateStatus(item: Immunisation, index: number, e: MouseEvent): void
    {
        e.preventDefault();

        // prevent from multiple clicks
        if (this.updateButtonsTriggered)
        {
            return;
        }

        this.updateButtonsTriggered = true;

        item.statusLoading = true;

        const sendObj = {
            id: item.id,
            status: !item.status
        };

        this._immunisationService
            .updateStatus(sendObj, index)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => setTimeout(() => item.statusLoading = this.updateButtonsTriggered = false, 250))
            )
            .subscribe(
                message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                error =>
                {
                    throw error;
                }
            );
    }

    toggleSidebar(name: string): void
    {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    clearSearch(e: MouseEvent): void
    {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.resetSearch(true);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {

        this.updateTableScroll.unsubscribe();
        
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }
}

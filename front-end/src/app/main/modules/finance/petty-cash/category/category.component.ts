
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import * as _ from 'lodash';
import { fadeMotion, NzModalRef, NzModalService, slideMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import { AddNewCategoryComponent } from '../dialog/add-new-category/add-new-category.component';
import { Category } from '../model/category.model';
import { CategoryService } from '../services/category.service';

@Component({
    selector: 'petty-cash-category',
    templateUrl: './category.component.html',
    styleUrls: ['./category.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CategoryComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    pageNumber: number;
    catergory: Category[];
    pageIndex: any;
    pageSize: any;
    pageSizeChanger: boolean;
    pageSizeOptions: number[];
    paginationMeta: any;
    total: number;
    listViewLoading: boolean;
    buttonLoader: boolean;
    dialogRef: any;
    searchInput: FormControl;
    hasActionButton = true;
    mobilePagination: boolean;
    confirmModal: NzModalRef;

    constructor(
        private _logger: NGXLogger,
        private _categoryService: CategoryService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _mediaObserver: MediaObserver,
    ) {

        this._unsubscribeAll = new Subject();
        this.total = 0;
        this.pageSizeChanger = true;
        this.listViewLoading = false;
        this.catergory = [];
        this.searchInput = new FormControl({ value: null, disabled: false });
        this.mobilePagination = false;
        this.pageSize = this._categoryService.defaultPageSize;
        this.pageIndex = this._categoryService.defaultPageIndex;
        this.pageSizeOptions = this._categoryService.defaultPageSizeOptions;
        this.paginationMeta = this._categoryService.paginationMeta ? this._categoryService.paginationMeta : null;

        console.log(this.pageSize);

    }



    ngOnInit() {

        // Subscribe to media query changes
        this._mediaObserver
            .asObservable()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(changes => {
                this.mobilePagination = changes.map((c: { mqAlias: any; }) => c.mqAlias).filter((i: string) => i === 'xs').length > 0;
            });

        // Subscribe to category list changes
        this._categoryService
            .onCategoryChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[list view - catergory]', response);

                this.catergory = response.items;
                this.total = response.totalDisplay;
                this.paginationMeta = response.meta;

                this.total < 1 ? this.searchInput.disable() : this.searchInput.enable();
                this.searchInput.updateValueAndValidity();

            });

        this._categoryService
            .onViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: any) => {
                this.listViewLoading = value;

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
                    this._categoryService.onSearchTextChanged.next(searchText);
                }
            });
    }

    /**
   * On destroy
   */
    ngOnDestroy(): void {
        // this._categoryService.unsubscribeOptions();

        // Unsubscribe from all subscriptions
        // this._unsubscribeAll.next();
        // this._unsubscribeAll.complete();
    }

    addCategory(e: MouseEvent): void {
        e.preventDefault();
        this.buttonLoader = true;

        setTimeout(() => this.buttonLoader = false, 200);

        this.dialogRef = this._matDialog
            .open(AddNewCategoryComponent,
                {
                    panelClass: 'category-new-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.NEW,
                        response: {}
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

    editCategory(e: MouseEvent, item: Category): void {
        e.preventDefault();
        this.buttonLoader = true;
        item.isLoading = true;

        setTimeout(() => this.buttonLoader = false, 200);
        setTimeout(() => item.isLoading = false, 500);

        this.dialogRef = this._matDialog
            .open(AddNewCategoryComponent,
                {
                    panelClass: 'category-new-dialog',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        action: AppConst.modalActionTypes.EDIT,
                        data: item
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


    clearSearch(e: MouseEvent, _emit: boolean = true): void {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.searchInput.patchValue('', { emitEvent: _emit });
    }

    onPaginationChange(reset: boolean = false): void {
        if (reset) {
            this.pageIndex = this._categoryService.defaultPageIndex;
        }

        console.log('page siaze changes,');

        this._categoryService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    delete(e: MouseEvent, item: Category): void {
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
                            this._categoryService
                                .delete(item.id)
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
                }
            );
    }
}

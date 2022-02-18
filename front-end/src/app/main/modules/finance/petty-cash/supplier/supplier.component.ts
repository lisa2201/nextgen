import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import * as _ from 'lodash';
import { fadeMotion, NzModalRef, NzModalService, slideMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import { AddNewSupplierComponent } from '../dialog/add-new-supplier/add-new-supplier.component';
import { Supplier } from '../model/supplier.model';
import { SupplierService } from '../services/supplier.service';

@Component({
  selector: 'petty-cash-supplier',
  templateUrl: './supplier.component.html',
  styleUrls: ['./supplier.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SupplierComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    pageNumber: number;
    supplier: Supplier[];
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
        private _supplierService: SupplierService,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _mediaObserver: MediaObserver,
    ) {
        
        this._unsubscribeAll = new Subject();
        this.total = 0;
        this.pageSizeChanger = true;
        this.listViewLoading = false;
        this.supplier = [];
        this.searchInput = new FormControl({ value: null, disabled: false });
        this.mobilePagination = false;
        this.pageSize = this._supplierService.defaultPageSize;
        this.pageIndex = this._supplierService.defaultPageIndex;
        this.pageSizeOptions = this._supplierService.defaultPageSizeOptions;
        this.paginationMeta = this._supplierService.paginationMeta ? this._supplierService.paginationMeta : null;

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

        // Subscribe to supplier list changes
        this._supplierService
            .onSupplierChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[list view - supplier]', response);
                this.supplier = response.items;
                this.total = response.totalDisplay;
                this.paginationMeta = response.meta;
                this.total < 1 ? this.searchInput.disable() : this.searchInput.enable();
                this.searchInput.updateValueAndValidity();

            });

            this._supplierService
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
                    this._supplierService.onSearchTextChanged.next(searchText);
                }
            });
    }

      /**
     * On destroy
     */
       ngOnDestroy(): void
       {
        //    this._supplierService.unsubscribeOptions();
   
           // Unsubscribe from all subscriptions
        //    this._unsubscribeAll.next();
        //    this._unsubscribeAll.complete();
       }

       addSupplier(e: MouseEvent): void
       {
           e.preventDefault();
           this.buttonLoader = true;
   
           setTimeout(() => this.buttonLoader = false, 200);
   
           this.dialogRef = this._matDialog
               .open(AddNewSupplierComponent,
               {
                   panelClass: 'supplier-new-dialog',
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
               .subscribe(message =>
               {                            
                   if ( !message )
                   {
                       return;
                   }
   
                   this._notification.clearSnackBar();
   
                   setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
               });
       }

       editSupplier(e: MouseEvent, item: Supplier): void
       {
           e.preventDefault();
           this.buttonLoader = true;
           item.isLoading = true;
   
           setTimeout(() => this.buttonLoader = false, 200);
           setTimeout(() => item.isLoading = false, 500);
   
           this.dialogRef = this._matDialog
               .open(AddNewSupplierComponent,
               {
                   panelClass: 'supplier-new-dialog',
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
               .subscribe(message =>
               {                            
                   if ( !message )
                   {
                       return;
                   }
   
                   this._notification.clearSnackBar();
   
                   setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
               });
       }


    clearSearch(e: MouseEvent, _emit: boolean = true): void
    {
        if (!_.isNull(e)) { e.preventDefault(); }

        this.searchInput.patchValue('', { emitEvent: _emit });
    }

    onPaginationChange(reset: boolean = false): void
    {
        if (reset)
        {
            this.pageIndex = this._supplierService.defaultPageIndex;
        }

        this._supplierService.onPaginationChanged.next({
            page: this.pageIndex,
            size: this.pageSize
        });
    }

    delete(e: MouseEvent, item:Supplier): void
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
                    nzOnOk: () =>
                    {
                        return new Promise((resolve, reject) =>
                        {
                            this._supplierService
                                .deleteSupplier(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message =>
                                    {
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

import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { NotificationService } from 'app/shared/service/notification.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { parseISO } from 'date-fns';
import * as _ from 'lodash';
import { fadeMotion, NzModalRef, NzModalService, slideMotion } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { AddNewReceiptComponent } from '../dialog/add-new-receipt/add-new-receipt.component';
import { AddNewReimbursementComponent } from '../dialog/add-new-reimbursement/add-new-reimbursement.component';
import { PettyCashPrintViewComponent } from '../dialog/petty-cash-print-view/petty-cash-print-view.component';
import { Category } from '../model/category.model';
import { Receipt } from '../model/receipt.model';
import { Reimbursement } from '../model/reimbursements.model';
import { Supplier } from '../model/supplier.model';
import { CategoryService } from '../services/category.service';
import { SupplierService } from '../services/supplier.service';

@Component({
    selector: 'petty-cash-summery-view',
    templateUrl: './summery-view.component.html',
    styleUrls: ['./summery-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SummeryViewComponent implements OnInit {
    private _unsubscribeAll: Subject<any>;

    receipt: Receipt[];
    reimbursement:Reimbursement[];
    dialogRef: any;
    reportData: any;
    start_date: string;
    end_date: string;
    onViewLoading: boolean;
    confirmModal: NzModalRef;
    buttonLoader: boolean;

    constructor(
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _notification: NotificationService,
        private _matDialog: MatDialog,
        private _supplierService: SupplierService,
        private _categoryService: CategoryService,
    ) {
        this._unsubscribeAll = new Subject();
        this.reportData = [];
        this.start_date = '';
        this.end_date = '';
        this.onViewLoading = false;
        this.receipt = null;
        this.reimbursement = null;
    }


    ngOnInit() {

        this._supplierService
            .onReportChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report view - supplier]', response);
                this.reportData = response.item? response.item : [];
                this.start_date = response.start_date;
                this.end_date = response.end_date;

            });

            this._supplierService
            .onReceiptChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[list view - receipt]', response);

                this.receipt = response.items;

            });

            // Subscribe to category list changes
      this._supplierService
      .onReimbursementChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any) => {
          this._logger.debug('[list view - reimbursement]', response);

          this.reimbursement = response.items;

      });

        this._supplierService
            .onReportViewLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: any) => {

                this.onViewLoading = value;

            });
    }

    getTotal(mode: boolean): number {

        return this._supplierService.creditTotal(this.reportData, mode);
    }

    getTitle(desc: string): string {
        return desc === 'opening_balance' ? 'Balance carried forward' : desc;
    }

    addReceipt(e: MouseEvent): void {
        e.preventDefault();
        // this.buttonLoader = true;

        Promise.all([
            this._categoryService.getAllCategory(AppConst.PattrCashCategoryType[0].value, '0'),
            this._supplierService.getAllSupplier('0')
        ])
            .then(([category, supplier]: [Category[], Supplier[]]) => {

                setTimeout(() => this.buttonLoader = false, 500);
                this.dialogRef = this._matDialog
                    .open(AddNewReceiptComponent,
                        {
                            panelClass: 'add-new-receipt',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                data: {
                                    supplier: supplier,
                                    category: category
                                }
                            }
                        });
                setTimeout(() => this.buttonLoader = false, 500);
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
    editReceipt(e: MouseEvent, index: string): void {
        e.preventDefault();
        let receipt = this.receipt.find(v => v.id === index);
        
        this.onViewLoading = true;

        Promise.all([
            this._categoryService.getAllCategory(AppConst.PattrCashCategoryType[0].value,'1'),
            this._supplierService.getAllSupplier('1')
        ])
            .then(([category, supplier]: [Category[], Supplier[]]) => {

                setTimeout(() => this.onViewLoading = false, 500);

                this.dialogRef = this._matDialog
                    .open(AddNewReceiptComponent,
                        {
                            panelClass: 'add-new-receipt',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.EDIT,
                                data: {
                                    supplier: supplier,
                                    category: category,
                                    item: receipt
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

                        // this._supplierService.getReportPdf(null,false);
                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                    })
            });
    }

    deleteReceipt(e: MouseEvent, index: string): void {
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
                            this._supplierService
                                .deleteReceipt(index)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => {
                                        // this._supplierService.getReportPdf(null,false);
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

    addReimbursement(e: MouseEvent): void {
        e.preventDefault();
        // this.buttonLoader = true;

        Promise.all([
            this._categoryService.getAllCategory(AppConst.PattrCashCategoryType[1].value,'0')
        ])
            .then(([category]: [Category[]]) => {

                setTimeout(() => this.buttonLoader = false, 500);
                this.dialogRef = this._matDialog
                    .open(AddNewReimbursementComponent,
                        {
                            panelClass: 'add-new-reimbursement',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.NEW,
                                data: {
                                    category: category
                                }
                            }
                        });
                setTimeout(() => this.buttonLoader = false, 500);
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

    editReimbursement(e: MouseEvent, index: string): void {
        e.preventDefault();
        this.onViewLoading = true;
        let reimbursement = this.reimbursement.find(v => v.id === index);

        Promise.all([
            this._categoryService.getAllCategory(AppConst.PattrCashCategoryType[1].value,'1')
        ])
            .then(([category]: [Category[]]) => {

                this.onViewLoading = false;
                this.dialogRef = this._matDialog
                    .open(AddNewReimbursementComponent,
                        {
                            panelClass: 'add-new-reimbursement',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                action: AppConst.modalActionTypes.EDIT,
                                data: {
                                    category: category,
                                    item: reimbursement
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

                        // this._supplierService.getReportPdf(null,false);
                        this._notification.clearSnackBar();

                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                    })
            });
    }

    
    deleteReimbursement(e: MouseEvent, index:string): void
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
                                .deleteReimbursement(index)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message =>
                                    {
                                        // this._supplierService.getReportPdf(null,false);
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

    print(e: MouseEvent): void
    {
        e.preventDefault();
        this.buttonLoader = true;
        setTimeout(() => this.buttonLoader = false, 500);
        this.dialogRef = this._matDialog
            .open(PettyCashPrintViewComponent,
                {
                    panelClass: 'petty-cash-print',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                    }
                });
        setTimeout(() => this.buttonLoader = false, 500);
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

    getFormatedDate(date: string) {

        return date? DateTimeHelper.getUtcDate(parseISO(date), 'DD-MM-YYYY'): 'N/A';
    }

    reloadTable(e: MouseEvent): void {

        this._supplierService.getReportPdf(null, false).subscribe();
    }
}

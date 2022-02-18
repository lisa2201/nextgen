import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { finalize, takeUntil, shareReplay } from 'rxjs/operators';

import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';

import { CommonService } from 'app/shared/service/common.service';
import { CreatePaymentMethodComponent } from './modal/create-payment-method/create-payment-method.component';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { PaymentMethod } from './payment-method.model';
import { AppConst } from 'app/shared/AppConst';
import { PaymentMethodsService } from './services/payment-methods.service';

@Component({
    selector: 'app-payment-methods',
    templateUrl: './payment-methods.component.html',
    styleUrls: ['./payment-methods.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PaymentMethodsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    
    paymentMethodsList: PaymentMethod[];
    buttonLoader: boolean;
    dialogRef: any;
    confirmModal: NzModalRef;
    setDefaultClicked: boolean;

    /**
     * Constructor
     * @param _commonService 
     * @param _matDialog 
     * @param _notification 
     * @param _paymentService 
     * @param _route 
     * @param _modalService 
     */
    constructor(
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _paymentMethodsService: PaymentMethodsService,
        private _route: ActivatedRoute,
        private _modalService: NzModalService
    ) {
        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;
        this.setDefaultClicked = false;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.setInitialData();

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        if (this.confirmModal) {
            this.confirmModal.close();
        }
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Set initial data
     */
    setInitialData(): void {

        // Set initial resolve data
        this.paymentMethodsList = this._route.snapshot.data.resolveData;

        // Subscribe to changes
        this._paymentMethodsService.onPaymentMethodsChanged
        .pipe(
            takeUntil(this._unsubscribeAll)
        )
        .subscribe((data: PaymentMethod[]) => {
            this.paymentMethodsList = data;
        });

    }

    /**
     * Add dialog
     * @param {MouseEvent} event
     */
    addDialog(event: MouseEvent): void {

        event.preventDefault();

        this.buttonLoader = true;

        forkJoin([
            this._commonService.getCountries(),
            this._paymentMethodsService.getEzidebitId(),
            this._paymentMethodsService.getOrg()
        ])
        .pipe(
            finalize(() => {
                this.buttonLoader = false;
            })
        )
        .subscribe(([countries, ezidebitRef, organization]) => {
            
            this.dialogRef = this._matDialog
                .open(CreatePaymentMethodComponent,
                    {
                        panelClass: 'create-payment-method-dialog',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            countries: countries,
                            ezidebitRef: ezidebitRef.reference,
                            eddrUrl: ezidebitRef.eddr_url,
                            ezidebitPublicKey: ezidebitRef.public_key,
                            organization: organization,
                            response: {}
                        }
                    });
    
            this.dialogRef
                .afterClosed()
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((message: string) => {
                    if (!message) {
                        return;
                    }
    
                    this._notification.clearSnackBar();
    
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                });

        });


    }

    /**
     * Delete payment method
     * @param {PaymentMethod} item
     * @param {MouseEvent} event 
     */
    delete(item: PaymentMethod, event: MouseEvent): void {

        event.preventDefault();

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
                            this._paymentMethodsService
                                .deletePaymentMethod(item.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message => setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200),
                                    error => {
                                        throw error;
                                    }
                                );
                        });
                    }
                }
            );


    }

    /**
     * Set default payment method
     * @param {PaymentMethod} item 
     * @param {number} index 
     * @param {MouseEvent} event 
     */
    setDefault(item: PaymentMethod, index: number, event: MouseEvent): void {

        event.preventDefault();

        if (this.setDefaultClicked) {
            return;
        }

        item.isLoading = true;
        this.setDefaultClicked = true;

        this._paymentMethodsService.setDefaultPaymentMethod(item.id, index)
            .pipe(
                takeUntil(this._unsubscribeAll),
                shareReplay(),
                finalize(() => {

                    setTimeout(() => {
                        this.setDefaultClicked = false;
                        item.isLoading = false;
                    }, 200);

                })
            )
            .subscribe(
                (message: string) => {
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                },
                (error) => {
                    throw error;
                }
            );

    }

}

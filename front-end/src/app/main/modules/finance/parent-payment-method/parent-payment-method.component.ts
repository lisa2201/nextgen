import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject, forkJoin } from 'rxjs';
import { ParentPaymentMethod } from './parent-payment-method.model';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import { CommonService } from 'app/shared/service/common.service';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { ActivatedRoute } from '@angular/router';
import { finalize, takeUntil, shareReplay } from 'rxjs/operators';
import { ParentPaymentMethodsService } from './services/parent-payment-methods.service';
import { CreateParentPaymentMethodComponent } from './dialog/create-parent-payment-method/create-parent-payment-method.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';
import { User } from '../../user/user.model';
import { AuthService } from 'app/shared/service/auth.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-parent-payment-method',
    templateUrl: './parent-payment-method.component.html',
    styleUrls: ['./parent-payment-method.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentPaymentMethodComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    paymentMethodsList: ParentPaymentMethod[];
    buttonLoader: boolean;
    dialogRef: any;
    confirmModal: NzModalRef;
    setDefaultClicked: boolean;
    user: User | null;
    parentLevel: boolean;

    constructor(
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _parentPaymentMethodsService: ParentPaymentMethodsService,
        private _modalService: NzModalService,
        private _authService: AuthService,
        private _location: Location
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
        this.parentLevel = this._authService.isParent();

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

        // Subscribe to changes
        this._parentPaymentMethodsService.onPaymentMethodsChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((data: ParentPaymentMethod[]) => {
                this.paymentMethodsList = data;
            });

        this._parentPaymentMethodsService.onUserChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((user) => {
                this.user = user;
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
            this._parentPaymentMethodsService.getDependency(this.user ? this.user.id : null),
            this._commonService.getCountries()
        ])
            .pipe(
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe(([depData, countries]) => {

                this.dialogRef = this._matDialog
                    .open(CreateParentPaymentMethodComponent,
                        {
                            panelClass: 'create-payment-method-dialog',
                            closeOnNavigation: true,
                            disableClose: true,
                            autoFocus: false,
                            data: {
                                countries: countries,
                                ezidebit_ref: depData.reference,
                                valid_address: depData.valid_address,
                                provider: depData.provider,
                                user: depData.user,
                                public_key: depData.public_key,
                                eddr_url: depData.eddr_url,
                                has_bpay: depData.has_bpay,
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

                        setTimeout(() => {
                            this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                            this._parentPaymentMethodsService.listPaymentMethods(this.user ? this.user.id : null);
                        }, 200);
                    });

            });


    }

    /**
     * Delete payment method
     * @param {MouseEvent} event 
     * @param {PaymentMethod} item
     * @param {number} index
     */
    delete(event: MouseEvent, item: ParentPaymentMethod, index: number): void {

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
                            this._parentPaymentMethodsService
                                .deletePaymentMethod({ id: item.id, user_id: this.user ? this.user.id : null }, index)
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
    setDefault(event: MouseEvent, item: ParentPaymentMethod, index: number): void {

        event.preventDefault();

        if (this.setDefaultClicked) {
            return;
        }

        item.isLoading = true;
        this.setDefaultClicked = true;

        this._parentPaymentMethodsService.setDefaultPaymentMethod({ id: item.id, user_id: this.user ? this.user.id : null }, index)
            .pipe(
                takeUntil(this._unsubscribeAll),
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

    /**
     * Set default payment method
     * @param {MouseEvent} event 
     * @param {ParentPaymentMethod} id
     */
    syncPaymentMethod(event: MouseEvent, item: ParentPaymentMethod): void {

        event.preventDefault();

        item.isLoading = true;

        this._parentPaymentMethodsService.syncParentPaymentMethod({ id: item.id })
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    item.isLoading = false;
                })
            )
            .subscribe(
                (message: string) => {
                    setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                    this._parentPaymentMethodsService.listPaymentMethods(this.user ? this.user.id : null);
                },
                (error) => {
                    throw error;
                }
            );

    }

    deactivate(event: MouseEvent, item: ParentPaymentMethod, index: number): void {

        event.preventDefault();

        if (this.setDefaultClicked) {
            return;
        }

        item.isLoading = true;
        this.setDefaultClicked = true;

        this._parentPaymentMethodsService.deactivatePaymentMethod({ id: item.id }, index)
            .pipe(
                takeUntil(this._unsubscribeAll),
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

    /**
   * go back
   *
   * @param {MouseEvent} e
   */
    onBack(e: MouseEvent): void {
        e.preventDefault();
        this._location.back();
    }

}

import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { forkJoin, Subject } from 'rxjs';
import { ParentPaymentProvidersService } from './services/parent-payment-providers.service';
import { NGXLogger } from 'ngx-logger';
import { CommonService } from 'app/shared/service/common.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { NotificationService } from 'app/shared/service/notification.service';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AddParentPaymentProvidersDialogComponent } from './dialogs/add-parent-payment-providers-dialog/add-parent-payment-providers-dialog.component';
import { AppConst } from 'app/shared/AppConst';
import { MatDialog } from '@angular/material/dialog';
import * as _ from 'lodash';

@Component({
    selector: 'app-parent-payment-providers',
    templateUrl: './parent-payment-providers.component.html',
    styleUrls: ['./parent-payment-providers.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentPaymentProvidersComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    providerFull: boolean;
    buttonLoader: boolean;
    dialogRef: any;

    constructor(
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _parentPaymentProviderService: ParentPaymentProvidersService,
        private _notification: NotificationService,
        private _matDialog: MatDialog
    ) {
        this._unsubscribeAll = new Subject();
        this.providerFull = false;
        this.buttonLoader = false;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._parentPaymentProviderService.onPaymentProvidersChanged
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((response) => {
                this.providerFull = response.providerFull === true ? true: false;
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._parentPaymentProviderService.unsubscribeOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.triggerResize();
    }

    addDialog(event: MouseEvent): void {

        event.preventDefault();

        this.buttonLoader = true;

        forkJoin([
            this._parentPaymentProviderService.getBranchList()
        ])
        .pipe(
            finalize(() => {
                this.buttonLoader = false;
            })
        )
        .subscribe(([branches]) => {

            if (branches.length === 0) {
                setTimeout(() => this._notification.displaySnackBar('Please add branch to proceed', NotifyType.ERROR), 500);
                return;
            }

            this.dialogRef = this._matDialog
                .open(AddParentPaymentProvidersDialogComponent,
                    {
                        panelClass: 'parent-payent-provider-dialog',
                        closeOnNavigation: true,
                        disableClose: true,
                        autoFocus: false,
                        data: {
                            action: AppConst.modalActionTypes.NEW,
                            branches: branches,
                            response: {}
                        }
                    });

            this.dialogRef
                .afterClosed()
                .subscribe((message: string) => {

                    if (!message) {
                        return;
                    }

                    this._notification.clearSnackBar();
                    setTimeout(() => {
                        this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                        this._parentPaymentProviderService.listParentPaymentAccounts();
                    }, 200);

                });

        });

    }

}

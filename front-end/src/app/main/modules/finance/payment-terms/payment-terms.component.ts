import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { Subject } from 'rxjs';
import { AddEditPaymentTermsComponent } from './dialogs/add-edit-payment-terms/add-edit-payment-terms.component';
import { PaymentTermsService } from './services/payment-terms.service';

@Component({
    selector: 'app-payment-terms',
    templateUrl: './payment-terms.component.html',
    styleUrls: ['./payment-terms.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PaymentTermsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    dialogRef: any;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;
    
    constructor(
        private _commonService: CommonService,
        private _matDialog: MatDialog,
        private _notification: NotificationService,
        private _paymentTermsService: PaymentTermsService
    ) {
        this._unsubscribeAll = new Subject();
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._paymentTermsService.unsubscribeOptions();

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

    openAddPaymentTermsDialog(event: MouseEvent): void {

        event.preventDefault();

        this.dialogRef = this._matDialog
        .open(AddEditPaymentTermsComponent,
            {
                panelClass: 'add-edit-payment-terms-dialog',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: {
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
                    this._paymentTermsService.listPaymentTerms();
                }, 200);

            });

    }

}

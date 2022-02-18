import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { CommonService } from 'app/shared/service/common.service';
import { FinanceAccountsService } from './services/finance-accounts.service';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from 'app/shared/service/notification.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { takeUntil, finalize } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { FinanceService } from '../shared/services/finance.service';
import { AuthService } from 'app/shared/service/auth.service';

@Component({
    selector: 'app-finance-accounts',
    templateUrl: './finance-accounts.component.html',
    styleUrls: ['./finance-accounts.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    infoMessage: string;

    disableTransactionButton: boolean;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;
    
    /**
     * constructor
     * @param {CommonService} _commonService 
     * @param {BalanceAdjustmentsService} _balanceAdjustmentsService 
     * @param {MatDialog} _matDialog 
     * @param {NotificationService} _notification 
     */
    constructor(
        private _commonService: CommonService,
        private _financeAccountsService: FinanceAccountsService,
        private _notification: NotificationService,
        private _financeService: FinanceService,
        private _authService: AuthService
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

        this.infoMessage = `Daily at 07:00 AM (AEST), the system generates advanced payment bookings including CCS estimations. The date range for the advanced payment determined by the 'Billing Term' of the payment plan for a parent. This includes future booking updates including CCS estimations and past booking updates (excludes CCS estimation). The system checks for CCS payment every day at 09:30 AM (AEST). After the CCS Payment is applied, the CCS estimations are replaced by actual CCS amount paid by the government.`;

        this._financeService.disableButtonSubject
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: boolean) => {
                this.disableTransactionButton = value;
            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._financeAccountsService.unsubscribeOptions();
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

    updateTransactions(event: MouseEvent): void {

        event.preventDefault();

        this.buttonLoader = true;

        this._financeAccountsService.recalculateBalance()
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe((message: string) => {
                this._notification.clearSnackBar();
                this._financeService.handleBookingTransactionButton();

                setTimeout(() => {
                    this._notification.displaySnackBar(message, NotifyType.SUCCESS);
                }, 200);
            });

    }

}

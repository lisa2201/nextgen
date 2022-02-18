import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { Subject } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { CommonService } from 'app/shared/service/common.service';
import { FinanceAccountTransactionService } from './services/finance-account-transaction.service';
import { NotificationService } from 'app/shared/service/notification.service';

@Component({
    selector: 'app-finance-account-transactions',
    templateUrl: './finance-account-transactions.component.html',
    styleUrls: ['./finance-account-transactions.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceAccountTransactionsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;

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
        private _financeAccountTransactionService: FinanceAccountTransactionService,
        private _notification: NotificationService
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

        this._financeAccountTransactionService.unsubscribeOptions();
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

}

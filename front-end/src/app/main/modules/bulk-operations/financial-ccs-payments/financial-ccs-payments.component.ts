import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { FinancialCcsPaymentsService } from './services/financial-ccs-payments.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import * as moment from 'moment';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-financial-ccs-payments',
    templateUrl: './financial-ccs-payments.component.html',
    styleUrls: ['./financial-ccs-payments.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinancialCcsPaymentsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    buttonLoader: boolean;
    date: any;

    @ViewChild(FusePerfectScrollbarDirective, { static: false })
    directiveScroll: FusePerfectScrollbarDirective;
    
    /**
     * constructor
     * @param {CommonService} _commonService 
     * @param {MatDialog} _matDialog 
     * @param {NotificationService} _notification 
     */
    constructor(
        private _commonService: CommonService,
        private _financialCcsPaymentsService: FinancialCcsPaymentsService,
        private _notification: NotificationService
    ) {
        this._unsubscribeAll = new Subject();
        this.date = moment().format('YYYY-MM-DD');
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._financialCcsPaymentsService.setEvents();
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();

        this._financialCcsPaymentsService.unsubscribeOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Update Scroll
     */
    updateScroll(): void {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }

}

import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { BookingHistoryService } from '../services/booking-history.service';
import { CommonService } from 'app/shared/service/common.service';

import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { BookingHistoryMasterRollListViewComponent } from './list-view/list-view.component';

@Component({
    selector: 'booking-history-master-roll',
    templateUrl: './booking-history-master-roll.component.html',
    styleUrls: ['./booking-history-master-roll.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingHistoryMasterRollComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    disableFilterButton: boolean;
    filterActive: boolean;

    @ViewChild(BookingHistoryMasterRollListViewComponent)
    tableContentView: BookingHistoryMasterRollListViewComponent;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {BookingHistoryService} _bookingHistoryService
     * @param {CommonService} _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _fuseSidebarService: FuseSidebarService,
        private _bookingHistoryService: BookingHistoryService,
        private _commonService: CommonService
    )
    {
        // set default values
        

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('booking history master roll !!!');
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this._bookingHistoryService.unsubscribeOptions();
        
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate(['manage-master-roll']);
    }

    /**
     * Toggle sidebar
     *
     * @param name
     */
    toggleSidebar(name: string): void
    {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * Update content scroll
     */
    updateScroll(): void
    {
        this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 50);
    }

    /**
     * refresh children list
     *
     * @param {MouseEvent} e
     */
    refreshList(e: MouseEvent): void
    {
        e.preventDefault();
       
        
    }
}

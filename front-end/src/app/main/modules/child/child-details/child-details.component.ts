import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';

import * as _ from 'lodash';

import { MatDialog } from '@angular/material/dialog';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';

import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';

import { ChildrenService } from '../services/children.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { ChildEnrolmentService } from '../enrolment/services/enrolment.service';

import { Child } from '../child.model';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { CommonService } from 'app/shared/service/common.service';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';

@Component({
    selector: 'child-details-view',
    templateUrl: './child-details.component.html',
    styleUrls: ['./child-details.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildDetailsComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;

    viewMoreBasicDetails: boolean;
    
    confirmModal: NzModalRef;

    buttonLoader: boolean;
    dialogRef: any;

    ccsExists: boolean;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildrenService} _childrenService
     * @param {NotificationService} _notification
     * @param {NzModalService} _modalService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {CommonService} _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _childrenService: ChildrenService,
        private _notification: NotificationService,
        private _modalService: NzModalService,
        private _fuseSidebarService: FuseSidebarService,
        private _commonService: CommonService,
        private _childEnrolmentService: ChildEnrolmentService,
        private _matDialog: MatDialog,
    ) {
        // Set default values
        this.viewMoreBasicDetails = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.ccsExists = true;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child details view !!!');

        // Subscribe to update current child on changes
        this._childrenService
            .onCurrentChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(currentChild =>
            {
                this._logger.debug('[child detail - current child]', currentChild);

                // close side bar menu
                this._fuseSidebarService.getSidebar('child-detail-navigation-sidebar').close();

                // set current child
                this.child = (!currentChild) ? null : currentChild;

            });

        // Subscribe to list view changes
        this._childrenService
            .onListViewItemChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() =>
            {
                // reset scroll position
                this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.TOP, 100);
            });

        // check if ccs records exists for current organization
        this._childrenService
            .ccsExistsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.ccsExists = value);
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void
    {

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        if (this.confirmModal)
        {
            this.confirmModal.close();    
        }
        
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
     * check if children available
     *
     * @readonly
     * @type {boolean}
     */
    get isChildrenAvailable(): boolean
    {
        return this._childrenService.hasChildren();
    }

    /**
     * show & hide additional details
     *
     * @param {MouseEvent} e
     */
    toggleMoreDetails(e: MouseEvent): void
    {
        e.preventDefault();

        this.viewMoreBasicDetails = !this.viewMoreBasicDetails; 
    }

    /**
     * deselect current child
     *
     * @param {MouseEvent} [e=null]
     */
    deselectCurrentChild(e: MouseEvent = null): void
    {
        if (e) { e.preventDefault(); }

        this._childrenService.onCurrentChildChanged.next(null);
    }

    /**
     * toggle sidebar
     *
     * @param {MouseEvent} e
     */
    toggleSidebar(name: string): void
    {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    /**
     * update view scroll
     */
    updateScroll(): void
    {
        if (this.directiveScroll)
        {
            setTimeout(() => this.directiveScroll.update(true), 250);
        }
    }

    /**
     * Delete child item
     *
     * @param {MouseEvent} e
     */
    delete(e: MouseEvent): void
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
                            this._childrenService
                                .deleteChild(this.child.id)
                                .pipe(
                                    takeUntil(this._unsubscribeAll),
                                    finalize(() => resolve())
                                )
                                .subscribe(
                                    message =>
                                    {
                                        setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);

                                        this.deselectCurrentChild();
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

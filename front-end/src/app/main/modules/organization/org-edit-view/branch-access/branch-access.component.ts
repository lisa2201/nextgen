import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { finalize } from 'rxjs/internal/operators/finalize';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { OrganizationService } from '../../services/organization.service';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { Branch } from 'app/main/modules/branch/branch.model';
import { Organization } from '../../Models/organization.model';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'org-branch-access',
    templateUrl: './branch-access.component.html',
    styleUrls: ['./branch-access.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class OrgBranchAccessComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    branches: Branch[];

    buttonLoader: boolean;
    updateButtonsTriggered: boolean;

    @Input() selected: Organization;

    confirmModal: NzModalRef;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _organizationService: OrganizationService,
        private _commonService: CommonService,
        private _notification: NotificationService,
        private _modalService: NzModalService
    )
    {
        // set default values
        this.buttonLoader = false;
        this.updateButtonsTriggered = false;

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
        this._logger.debug('org branch access !!!', this.selected);

        setTimeout(() => this.getSubscriberBranchLinks());
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

    /**
     * get enrolment history
     */
    getSubscriberBranchLinks(): void
    {
        this.buttonLoader = true;

        this.selected.branch.forEach(i => i.isLoading = this.buttonLoader);

        this._commonService.onApiProgressBarChanged.next(this.buttonLoader);

        this._organizationService.onOrgTabViewLoaderChanged.next(3);

        setTimeout(() =>
        {
            this._organizationService
                .getSubscriberBranchAccess(this.selected.id, this.selected.user.id)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        this.buttonLoader = false;

                        this.selected.branch.forEach(i => i.isLoading =  this.buttonLoader);

                        this._commonService.onApiProgressBarChanged.next( this.buttonLoader);
    
                        this._organizationService.onOrgTabViewLoaderChanged.next(null);
                    })
                )
                .subscribe(
                    response => 
                    {
                        this.selected.branch.forEach(i => i.disabled = _.compact(response.map((b: { branch: { id: string; }; }) => b.branch.id)).indexOf(i.id) > -1);
                    },
                    error =>
                    {
                        throw error;
                    },
                    () =>
                    {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
        }, 50);
    }

    /**
     *
     *
     * @returns {boolean}
     */
    showLinkAllButton(): boolean
    {
        return this.selected && this.selected.branch.filter(i => i.disabled).length !== this.selected.branch.length;
    }

    /**
     * update single branch
     *
     * @param {MouseEvent} e
     * @param {Branch} item
     * @returns {void}
     */
    toggleAccess(e: MouseEvent, item: Branch): void
    {
        e.preventDefault();

        if(this.buttonLoader || this.updateButtonsTriggered)
        {
            return;
        }

        this.updateButtonsTriggered = item.statusLoading = true;

        const sendItem = {
            user: this.selected.user.id,
            reference: [item.id],
            action: item.disabled ? '1' : '0'
        }

        this._logger.debug('[branch access]', sendItem);

        this._organizationService
            .updateSubscriberBranchAccess(sendItem)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() =>
                {
                    setTimeout(() => item.statusLoading = this.updateButtonsTriggered = false, 250);
                })
            )
            .subscribe(
                response => 
                {
                    _.head(this.selected.branch.filter(i => i.id === item.id)).disabled = _.indexOf(response.added, item.id) > -1;

                    setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200)
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * update all branch
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    linkBranch(e: MouseEvent, action: string = '0'): void
    {
        e.preventDefault();

        if(this.buttonLoader || this.updateButtonsTriggered)
        {
            return;
        }

        this.confirmModal = this._modalService
            .confirm(
                {
                    nzTitle: AppConst.dialogContent.UPDATE.TITLE,
                    nzContent: AppConst.dialogContent.UPDATE.BODY,
                    nzWrapClassName: 'vertical-center-modal',
                    nzOkText: 'Yes',
                    nzOkType: 'danger',
                    nzOnOk: () => 
                    {
                        this.buttonLoader = true;
                
                        this.selected.branch.forEach(i => i.isLoading = true);
                
                        const sendItem = {
                            user: this.selected.user.id,
                            reference: this.selected.branch.filter(i => action === '0' ? !i.disabled : i.disabled).map(b => b.id),
                            action: action
                        }
                
                        this._logger.debug('[branch access]', sendItem);
                
                        this._organizationService
                            .updateSubscriberBranchAccess(sendItem)
                            .pipe(
                                takeUntil(this._unsubscribeAll),
                                finalize(() =>
                                {
                                    this.buttonLoader = false;
                
                                    this.selected.branch.forEach(i => i.isLoading = false);
                                })
                            )
                            .subscribe(
                                response => 
                                {
                                    this.selected.branch.forEach(i => i.disabled = _.intersection(this.selected.branch.map(b => b.id), response.added).length > 0);
                
                                    setTimeout(() => this._notification.displaySnackBar(response.message, NotifyType.SUCCESS), 200);
                                },
                                error =>
                                {
                                    throw error;
                                }
                            );
                    }
                });
    }

    /**
     * open branch link
     *
     * @param {MouseEvent} e
     * @param {Branch} item
     * @returns {void}
     */
    openLinkInTab(e: MouseEvent, item: Branch): void
    {
        e.preventDefault();

        if (!item.status || !item.disabled)
        {
            return;
        }

        window.open(item.link, '_blank');
    }
}

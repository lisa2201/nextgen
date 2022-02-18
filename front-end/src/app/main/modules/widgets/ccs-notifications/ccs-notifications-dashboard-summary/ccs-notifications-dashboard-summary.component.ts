import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';

import { AuthClient } from 'app/shared/model/authClient';
import { Router } from '@angular/router';

@Component({
    selector: 'ccs-notifications-dashboard-summary',
    templateUrl: './ccs-notifications-dashboard-summary.component.html',
    styleUrls: ['./ccs-notifications-dashboard-summary.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CcsNotificationsDashboardSummaryComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    ccsNotificationData: any;
    is_sitemanager: boolean;
    widgetLoader: boolean;

    @Input() selectedBranch: string;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param _authService
     * @param _dashboardService
     * @param {Router} _router
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _dashboardService: DashboardService,
        private _router: Router
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.widgetLoader = false;
        this.is_sitemanager = false;
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.ccsNotificationData = {
            'CCSEntitlementVaried' : 0,
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        if(this._authService.isOwnerPath()){
            this.is_sitemanager = true;
        }

        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.updateCCSNotificationWidget(), 250);
            });
    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.updateCCSNotificationWidget(), 250);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------
    
    /**
     * get waitlist data
     */
    updateCCSNotificationWidget():void{

        this.widgetLoader = true;

        this._dashboardService
            .getCCSNotification(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                res => 
                {
                    this._logger.debug('[ccs notifications dashboard]', res);
                    this.ccsNotificationData = res;
                },
                error =>
                {
                    throw error;
                }
            );  
    }
              
    /**
     * navigate to waitlist page
     *
     * @returns {void}
     */
    navigateDay(e: MouseEvent): void
    {
        e.preventDefault();
        if(!this._authService.isOwner()){
            this._router.navigate(['bulk-operations/ccs-entitlement-variation'], { queryParams: { ref: 'day' } });
        }
        else
        {
            this._router.navigate(['bulk-operations/ccs-entitlement-variation'], { queryParams: { ref: 'day', branch: this.selectedBranch} })
        }
    }


    /**
     * navigate to waitlist page
     *
     * @returns {void}
     */
    navigateWeek(e: MouseEvent): void
    {
        e.preventDefault();
        if(!this._authService.isOwner()){
            this._router.navigate(['bulk-operations/ccs-entitlement-variation'], { queryParams: { ref: 'week' } });
        }
        else
        {
            this._router.navigate(['bulk-operations/ccs-entitlement-variation'], { queryParams: { ref: 'week', branch: this.selectedBranch} })
        }
    }
 
}

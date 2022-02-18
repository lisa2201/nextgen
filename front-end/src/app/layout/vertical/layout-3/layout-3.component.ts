import { Component, OnDestroy, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { navigation } from 'app/navigation/navigation';

import { FuseConfigService } from '@fuse/services/config.service';
import { AuthService } from 'app/shared/service/auth.service';
import { NGXLogger } from 'ngx-logger';

import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';

import { CommonService } from 'app/shared/service/common.service';

import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

@Component({
    selector     : 'vertical-layout-3',
    templateUrl  : './layout-3.component.html',
    styleUrls    : ['./layout-3.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class VerticalLayout3Component implements OnInit, OnDestroy
{
    fuseConfig: any;
    navigation: any;

    showView: boolean;

    // Private
    private _unsubscribeAll: Subject<any>;

    @ViewChild(FusePerfectScrollbarDirective)
    scrollDirective: FusePerfectScrollbarDirective;

    /**
     * Constructor
     *
     * @param {FuseConfigService} _fuseConfigService
     * @param {AuthService} _authService
     * @param {NGXLogger} _logger
     */
    constructor(
        private _fuseConfigService: FuseConfigService,
        private _authService: AuthService,
        private _logger: NGXLogger,
        private _commonService: CommonService
    )
    {
        // Set the defaults
        this.navigation = navigation;

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
        // Subscribe to config changes
        this._fuseConfigService.config
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config: any) => 
            {
                this.fuseConfig = config;
            });

        // Subscribe to the user changes
        this._authService.currentUser
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: any) => 
            {
                this._logger.debug('[user layout]', user);
                this.showView = this._authService.isAuthenticated();
            });

        // Subscribe to parent scroll changes
        this._commonService
            ._updateParentScroll
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => setTimeout(() => this.updateParentScroll(), 50));
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
     * update main scroll bar
     *
     */
    updateParentScroll(): void
    {        
        if (this.scrollDirective)
        {
            this.scrollDirective.update(true);    
        }
    }
}

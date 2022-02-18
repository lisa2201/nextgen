import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';

@Component({
    selector: 'user-base-view-administration',
    templateUrl: './user-base-view-administration.component.html',
    styleUrls: ['./user-base-view-administration.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class UserBaseViewAdministrationComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    isParent: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _router: Router
    )
    {
        // set default values
        this.isParent = this._router.url.indexOf('/manage-parents') > -1;

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
        this._logger.debug('user bse view administration !!!', );
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
     * update scroll
     *
     * @param {*} e
     */
    updateScroll(e: any): void
    {

    }
}


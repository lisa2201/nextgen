import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';

import { AuthClient } from 'app/shared/model/authClient';

@Component({
    selector: 'sync-kinder-connect-profile',
    templateUrl: './sync-kinder-connect-profile.component.html',
    styleUrls: ['./sync-kinder-connect-profile.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SyncKinderConnectProfileComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    buttonLoader: boolean;

    @Input() id: string;
    @Input() type: string;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.buttonLoader = false;

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
        this._logger.debug('kinder connect sync profile !!!');
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

    syncProfile(e: MouseEvent): void
    {
        e.preventDefault();

        this.buttonLoader = true;

        this._authService
            .syncKinderConnectProfile(this.type, this.id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.buttonLoader = false)
            )
            .subscribe(
                message => {},
                error => 
                {
                    throw error;
                }
            );
    }
}

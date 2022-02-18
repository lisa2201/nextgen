import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { Invitation } from 'app/main/modules/invitation/invitation.model';


@Component({
    selector: 'show-invitation-roles',
    templateUrl: './show-invitation-roles.component.html',
    styleUrls: ['./show-invitation-roles.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ShowInvitationRolesComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    @Input() list: any;
    @Input() invitation: Invitation

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
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
        this._logger.debug('show invitation roles !!!');
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
}

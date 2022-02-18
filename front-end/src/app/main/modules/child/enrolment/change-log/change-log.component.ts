import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';

import { Enrolment } from '../models/enrolment.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AuthClient } from 'app/shared/model/authClient';

@Component({
    selector: 'enrolment-change-log',
    templateUrl: './change-log.component.html',
    styleUrls: ['./change-log.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildEnrolmentChangeLogComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;

    @Input() selected: Enrolment;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService
    )
    {
        // set default values
        this.client = this._authService.getClient();

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
        this._logger.debug('child enrolment status history !!!');
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

    getDate(value: string): string
    {
        return DateTimeHelper.parseMomentTzDateTime(value, this.client.timeZone).date;
    }

    getTime(value: string): string
    {
        return DateTimeHelper.parseMomentTzDateTime(value, this.client.timeZone).time;
    }
}


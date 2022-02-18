import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import {AuthService} from '../../../../shared/service/auth.service';
// import { ProviderNotificationService } from './services/provider-notification.service';

@Component({
    selector: 'ccs-session-submissions',
    templateUrl: './session-submissions.component.html',
    styleUrls: ['./session-submissions.component.scss'],
    // encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SessionSubmissionsComponent implements OnInit, OnDestroy {
    constructor(
        private _authService: AuthService,
        // private _providerNotificationService: ProviderNotificationService
    ) {}

    // tslint:disable-next-line: typedef
    ngOnInit(): void {
    }

    ngOnDestroy(): void {
        // this._providerNotificationService.unsubscribeOptions();
    }
}

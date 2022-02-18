import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ProviderNotification } from './provider-notification.model';
import { ProviderNotificationService } from './services/provider-notification.service';

@Component({
    selector: 'provider-notification-main',
    templateUrl: './provider-notification.component.html',
    styleUrls: ['./provider-notification.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ProviderNotificationComponent implements OnInit, OnDestroy {
    constructor(
        private _providerNotificationService: ProviderNotificationService
    ) {}

    // tslint:disable-next-line: typedef
    ngOnInit() {}

    ngOnDestroy(): void {
        this._providerNotificationService.unsubscribeOptions();
    }
}

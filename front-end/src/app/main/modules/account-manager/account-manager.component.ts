import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { NotificationService } from 'app/shared/service/notification.service';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { takeUntil, take } from 'rxjs/operators';
import * as _ from 'lodash';

@Component({
    selector: 'app-account-manager',
    templateUrl: './account-manager.component.html',
    styleUrls: ['./account-manager.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AccountManagerComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    navLinks: {path: string, label: string, index: number}[];
    activeTabIndex: number;

    constructor(
        private _router: Router
    ) {

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.activeTabIndex = -1;

        this.navLinks = [
            {
                path: 'providers',
                label: 'Providers',
                index: 0
            },
            {
                path: 'services',
                label: 'Services',
                index: 1
            },
            {
                path: 'personnels/service',
                label: 'Service Personnels',
                index: 2
            },

            {
                path: 'personnels/provider',
                label: 'Provider Personnels',
                index: 3
            }
        ];
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.initTabIndex();

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    initTabIndex(): void {
        this._router.events
        .pipe(
            takeUntil(this._unsubscribeAll)
        )
        .subscribe((res) => {
            this.activeTabIndex = _.findIndex(this.navLinks, { 'path': _.last(_.split(this._router.url, '/')) });
        });
    }

}

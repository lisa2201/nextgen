import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

@Component({
  selector: 'app-account-manager-branch',
  templateUrl: './account-manager-branch.component.html',
  styleUrls: ['./account-manager-branch.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AccountManagerBranchComponent implements OnInit {

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
            // {
            //     path: 'providers',
            //     label: 'Providers',
            //     index: 0
            // },
            
            {
                path: 'personnels/service-branch',
                label: 'Service Personnels',
                index: 1
            },
            {
                path: 'services-branch',
                label: 'Services',
                index: 2
            },

            // {
            //     path: 'personnels/provider',
            //     label: 'provider Personnels',
            //     index: 3
            // }
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
    // tslint:disable-next-line: use-lifecycle-interface
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

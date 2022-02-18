import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'app/shared/service/auth.service';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';

interface NavTabLinkData {
    path: string;
    label: string;
    index: number;
    permission: string;
}

@Component({
    selector: 'app-service-settings',
    templateUrl: './service-settings.component.html',
    styleUrls: ['./service-settings.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ServiceSettingsComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    allTabLinks: NavTabLinkData[];
    navLinks: NavTabLinkData[];
    activeTabIndex: number;


    constructor(
        private _router: Router,
        private _route: ActivatedRoute,
        private _authService: AuthService
    ) {

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.activeTabIndex = -1;

        this.navLinks = [];

        //  Set all the available links here
        this.allTabLinks = [
            {
                path: 'adjustment-items',
                label: 'Adjustment Items',
                index: 0,
                permission: 'N36'
            },
            {
                path: 'center-pincode',
                label: 'Center Pincode',
                index: 1,
                permission: 'N36'
            },
            {
                path: 'educator-ratio',
                label: 'Educator Ratio',
                index: 2,
                permission: 'N41'
            },
            {
                path: 'bus-list',
                label: 'Bus List',
                index: 3,
                permission: 'N59'
            }
        ];

        this.assignNavLinks();

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.initTabIndex();

        // Default route redirection
        setTimeout(() => {
            if (this._router.url === '/service-settings') {
                this._router.navigate([this.navLinks[0].path], { relativeTo: this._route });
            }
        }, 100);

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

    assignNavLinks(): void {
        
        // Check permission and assign the links
        // tslint:disable-next-line: prefer-const
        for (let navItem of this.allTabLinks) {
            if (this._authService.canAccess(['AC0'], navItem.permission)) {
                this.navLinks.push(navItem);
            }
        }

    }

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

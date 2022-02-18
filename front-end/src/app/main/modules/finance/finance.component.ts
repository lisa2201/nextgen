import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { AuthService } from 'app/shared/service/auth.service';

interface NavTabLinkData {
    path: string;
    label: string;
    index: number;
    permission: string;
}

@Component({
    selector: 'app-finance',
    templateUrl: './finance.component.html',
    styleUrls: ['./finance.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceComponent implements OnInit, OnDestroy {

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

        this.allTabLinks = [
            {
                path: 'financial-statements',
                label: 'Statements',
                index: 0,
                permission: 'N36'
            },
            {
                path: 'financial-adjustments',
                label: 'Financial Adjustments',
                index: 1,
                permission: 'N27'
            },
            {
                path: 'balance-adjustments',
                label: 'Balance Adjustments',
                index: 2,
                permission: 'N35'
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

        setTimeout(() => {
            if (this._router.url === '/finance') {
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

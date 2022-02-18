import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { FuseConfigService } from '@fuse/services/config.service';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { Addon } from './addon.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'market-place-auth',
    templateUrl: './market-place.component.html',
    styleUrls: ['./market-place.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class MarketPlaceComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    isLoading: boolean;
    copyRightYear: number;
    addons: Addon[];
    radioValue = 'monthly';

    /**
     * Constructor
     * @param {FuseConfigService} _fuseConfigService 
     * @param {NGXLogger} _logger 
     * @param {ActivatedRoute} route 
     */
    constructor(
        private _fuseConfigService: FuseConfigService,
        private _logger: NGXLogger,
        private route: ActivatedRoute,
    ) {
        // Configure the layout
        this._fuseConfigService.config = {
            layout: {
                style: 'vertical-layout-2',
                navbar: {
                    hidden: true
                },
                toolbar: {
                    hidden: true
                },
                footer: {
                    hidden: true
                },
                sidepanel: {
                    hidden: true
                }
            }
        };

        this.copyRightYear = DateTimeHelper.now().year();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.isLoading = false;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._logger.debug('market place !!!');
        this.addons = this.route.snapshot.data['resolveData'];
    }


    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


    changePrice(event: string, index: number): void {

        if (event === 'annually') {

            this.addons[index].price = this.addons[index].properties['annual_price'];

        } else {

            this.addons[index].price = this.addons[index].properties['monthly_price'];

        }
    }

}

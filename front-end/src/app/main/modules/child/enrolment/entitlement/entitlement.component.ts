import { Component, OnInit, Input, OnDestroy, ViewEncapsulation } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildEnrolmentService } from '../services/enrolment.service';
import { CommonService } from 'app/shared/service/common.service';

import { EnrolmentEntitlement } from '../models/entitlement.model';
import { Enrolment } from '../models/enrolment.model';


@Component({
    selector: 'child-enrolment-entitlement',
    templateUrl: './entitlement.component.html',
    styleUrls: ['./entitlement.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildEntitlementComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    entitlement: EnrolmentEntitlement;
    viewLoader: boolean;

    @Input() selected: Enrolment;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _childEnrolmentService: ChildEnrolmentService,
        private _commonService: CommonService
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
        this._logger.debug('child entitlementComponent !!!');

        this.getEnrolmentEntitlement();
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

    /**
     * get enrolment history
     */
    getEnrolmentEntitlement(): void
    {
        setTimeout(() =>
        {
            this.viewLoader = true;
    
            this._childEnrolmentService.onEnrolmentTabViewLoaderChanged.next(3);

            this._commonService.onApiProgressBarChanged.next(this.viewLoader);
            
            this._childEnrolmentService
                .getEntitlement(this.selected.id)
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    finalize(() =>
                    {
                        this.viewLoader = false;
    
                        this._childEnrolmentService.onEnrolmentTabViewLoaderChanged.next(null);

                        this._commonService.onApiProgressBarChanged.next(this.viewLoader);
                    })
                )
                .subscribe(
                    response => this.entitlement = response,
                    error =>
                    {
                        throw error;
                    },
                    () =>
                    {
                        this._logger.debug('😀 all good. 🍺');
                    }
                );
        }, 50);
    }
}

import { Component, OnInit, ViewEncapsulation, OnDestroy, Input } from '@angular/core';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildEnrolmentService } from '../services/enrolment.service';
import { CommonService } from 'app/shared/service/common.service';

import { EnrolmentHistory } from '../models/enrolment-history.model';
import { Child } from '../../child.model';

@Component({
    selector: 'child-enrolment-history',
    templateUrl: './enrolment-history.component.html',
    styleUrls: ['./enrolment-history.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildEnrolmentHistoryComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    history: EnrolmentHistory[];
    viewLoader: boolean;

    @Input() selected: Child;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {ChildEnrolmentService} _childEnrolmentService
     * @param {CommonService} _commonService
     */
    constructor(
        private _logger: NGXLogger,
        private _childEnrolmentService: ChildEnrolmentService,
        private _commonService: CommonService
    )
    {
        // set default values
        this.viewLoader = false;

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
        this._logger.debug('child enrolment history !!!');

        if (this.selected.hasEnrolment())
        {
            this.getEnrolmentHistory();
        }
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
    getEnrolmentHistory(): void
    {
        setTimeout(() =>
        {
            this.viewLoader = true;
    
            this._childEnrolmentService.onEnrolmentTabViewLoaderChanged.next(2);

            this._commonService.onApiProgressBarChanged.next(this.viewLoader);
            
            this._childEnrolmentService
                .getEnrolmentHistory(this.selected.getEnrolment().id)
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
                    response => this.history = response,
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

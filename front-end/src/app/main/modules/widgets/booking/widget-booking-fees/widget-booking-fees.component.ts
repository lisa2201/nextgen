import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { ChildBookingService } from 'app/main/modules/child/booking/services/booking.service';
import { AuthService } from 'app/shared/service/auth.service';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';

import { Booking } from 'app/main/modules/child/booking/booking.model';
import { Branch } from 'app/main/modules/branch/branch.model';
import { AuthClient } from 'app/shared/model/authClient';

@Component({
    selector: 'widget-booking-fees',
    templateUrl: './widget-booking-fees.component.html',
    styleUrls: ['./widget-booking-fees.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class WidgetBookingFeesComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    booking: Booking[];
    branches: Branch[];
    client: AuthClient;
    data: { today: number, week: number };

    widgetLoader: boolean;

    @Input() selectedBranch: string;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _bookingService: ChildBookingService,
        private _dashboardService: DashboardService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.widgetLoader = false;
        this.data = {
            today: 0,
            week: 0
        };

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
        this._logger.debug('widgets - booking fees !!!', this.selectedBranch);

        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.getBookingFees(), 250);
            });
    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.getBookingFees(), 250);
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
     * get booking fees
     */
    getBookingFees(): void
    {
        this.widgetLoader = true;

        this._bookingService
            .getBookingFees(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                res => 
                {
                    this.data.today = res.today;
                    this.data.week = res.week;
                },
                error =>
                {
                    throw error;
                }
            );
    }

    /**
     * update booking fees
     *
     * @param {MouseEvent} e
     */
    updateWidget(e: MouseEvent): void
    {
        e.preventDefault();

        this.getBookingFees();
    }
}

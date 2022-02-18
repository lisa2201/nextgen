import { Component, OnInit, ViewEncapsulation, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { AuthClient } from 'app/shared/model/authClient';
import { NGXLogger } from 'ngx-logger';
import { AuthService } from 'app/shared/service/auth.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';

@Component({
    selector: 'app-parent-payment-summary-widget',
    templateUrl: './parent-payment-summary-widget.component.html',
    styleUrls: ['./parent-payment-summary-widget.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentPaymentSummaryWidgetComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    data: { today: number, week: number };

    widgetLoader: boolean;

    @Input() selectedBranch: string;

    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
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
        this._logger.debug('widgets - parent payment !!!', this.selectedBranch);

        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.getParentPaymentSummary(), 250);
            });
    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.getParentPaymentSummary(), 250);
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


    getParentPaymentSummary(): void
    {
        this.widgetLoader = true;
        
        this._dashboardService
            .getParentPayments(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id)
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

    updateWidget(e: MouseEvent): void
    {
        e.preventDefault();

        this.getParentPaymentSummary();
    }

}

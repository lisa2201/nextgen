import { Component, OnInit, AfterViewInit, OnDestroy, ViewEncapsulation, Input } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { AuthClient } from 'app/shared/model/authClient';
import { NGXLogger } from 'ngx-logger';
import { AuthService } from 'app/shared/service/auth.service';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
    selector: 'app-parent-payment-overdue-widget',
    templateUrl: './parent-payment-overdue-widget.component.html',
    styleUrls: ['./parent-payment-overdue-widget.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ParentPaymentOverdueWidgetComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    data: { over_due: number, aged_debtors: number };

    selectedFilter: string;

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
            over_due: 0,
            aged_debtors: 0
        };
        this.selectedFilter = 'month';

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
        this._logger.debug('widgets - parent payment over due!!!', this.selectedBranch);

        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.getPaymentOverdue(), 250);
            });
    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.getPaymentOverdue(), 250);
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


    getPaymentOverdue(): void
    {
        this.widgetLoader = true;
        
        this._dashboardService
            .getPaymentOverdue(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id, this.selectedFilter)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                res => 
                {
                    this.data.over_due = res.over_due;
                    this.data.aged_debtors = res.aged_debtors;
                },
                error =>
                {
                    throw error;
                }
            );
    }

    setFilter(filter: string): void {

        this.selectedFilter = filter;
        this.getPaymentOverdue();

    }

    updateWidget(e: MouseEvent): void
    {
        e.preventDefault();

        this.getPaymentOverdue();
    }

}

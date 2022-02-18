import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';

import { AuthClient } from 'app/shared/model/authClient';

@Component({
    selector: 'widget-live-ratio',
    templateUrl: './widget-live-ratio.component.html',
    styleUrls: ['./widget-live-ratio.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class WidgetLiveRatioComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    attendances: any[];
    center_details: any[];

    widgetLoader: boolean;
    popupVisible: any[];

    @Input() selectedBranch: string;

    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param _authService
     * @param _dashboardService
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _dashboardService: DashboardService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.widgetLoader = false;

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
        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.updateAttendance(), 250);
            });
    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.updateAttendance(), 250);
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
     * get room attendance
     */
    updateAttendance(): void
    {
        this.widgetLoader = true;

        this._dashboardService
            .getLiveRatio(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                res => 
                {
                    this.attendances = res['room_data'];
                    this.center_details = res['center_data'];
                },
                error =>
                {
                    throw error;
                }
            );        
    }

    /**
     * update room attendance
     *
     * @param {MouseEvent} e
     */
    updateWidget(e: MouseEvent): void
    {
        e.preventDefault();

        this.updateAttendance();
    }

    /*closePopup(): void {
        this.popupVisible = false;
    }*/

    closePopupNew(attendance): void {
        this.attendances.filter(i => i===attendance)[0].popup_visible = false;
    }

    checkifVisible(attendance): boolean
    {
        return this.attendances.filter(i => i===attendance)[0].popup_visible;
    }

    changePopup(attendance,value: boolean): void {
        this.attendances.filter(i => i===attendance)[0].popup_visible = value;
    }
    
}

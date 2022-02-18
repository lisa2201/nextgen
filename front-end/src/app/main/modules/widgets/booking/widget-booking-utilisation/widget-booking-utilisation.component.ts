import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { format, startOfWeek } from 'date-fns';

import { AuthService } from 'app/shared/service/auth.service';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';

import { AuthClient } from 'app/shared/model/authClient';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'widget-booking-utilisation',
    templateUrl: './widget-booking-utilisation.component.html',
    styleUrls: ['./widget-booking-utilisation.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class WidgetBookingUtilisationComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    utilization: any;
    utilizationsub: any;
    utilizationConfig: any;
    utilizationSubConfig: any;
    openWeekPicker: boolean; 
    weektext: string;
    today: string;
    date: null;
    week_start: Date;
    room_filter: boolean;
    isSiteManager: boolean;

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
        private _dashboardService: DashboardService
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.widgetLoader = false;
        this.utilization = [];
        this.utilizationsub = [];
        this.today = null;
        this.openWeekPicker = false; 
        this.week_start = null;
        this.weektext = '';
        this.room_filter = false;
        this.setDefaultGraphData();
        this.isSiteManager = false;
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
        this.setCurrentDay();
              
        this.setDefaultGraphData();

        this.isSiteManager = this._authService.isOwnerPath();

        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.getBookingSummary(), 250);
            });
    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.getBookingSummary(), 250);
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
    
    setCurrentDay(){

        this.today = this._authService.getClient() ? DateTimeHelper.now().tz(this._authService.getClient().timeZone).format(AppConst.dateTimeFormats.dateOnly): DateTimeHelper.now().format(AppConst.dateTimeFormats.dateOnly);
        this.week_start = startOfWeek(new Date(this.today), {weekStartsOn: 1});
        this.weektext = format(this.week_start,'dd-MM-yyyy');

    }

    setDefaultGraphData(): void {
      
        this.utilizationConfig = {
            xAxis: true,
            yAxis: true,
            gradient: false,
            legend: true,
            showXAxisLabel: false,
            xAxisLabel: 'Days',
            showYAxisLabel: false,
            yAxisLabel: 'Child Capacity',
            scheme: {
                domain: ['#42BFF7', '#C6ECFD', '#C7B42C', '#AAAAAA']
            },
            onSelect: (ev) => {
                console.log(ev);
                if(ev.series){
                    this.room_filter = true;
                    this.updateRoomBookingSummary(ev.series);
                }
            }
        };

        this.utilizationSubConfig = {
            xAxis: true,
            yAxis: true,
            gradient: false,
            legend: true,
            showXAxisLabel: false,
            xAxisLabel: 'Rooms',
            showYAxisLabel: false,
            yAxisLabel: 'Child Capacity',
            scheme: {
                domain: ['#42BFF7', '#C6ECFD', '#C7B42C', '#AAAAAA']
            },
            onSelect: (ev) => {
                console.log(ev);
            }
        };

    }

    /**
     * get booking summary utilisation
     *
     * @returns {void}
     */
    getBookingSummary(): void
    {
        this.widgetLoader = true;

        this.room_filter = false;
        this._dashboardService
            .getBookingSummary(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id, format(this.week_start,'yyyy-MM-dd'), '')
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                res => 
                {
                    if(this.isSiteManager)
                        res.mainChart = res.mainChart.filter(i => i.name !== 'Sat' &&  i.name !== 'Sun');

                    this.utilization = res;
                },
                error =>
                {
                    throw error;
                }
            );            
    }
         
    /**
     * get booking summary utilisation by day
     *
     * @returns {void}
     */
    updateRoomBookingSummary(day: string): void
    {
        this.widgetLoader = true;

        this._dashboardService
            .getBookingSummary(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id, format(this.week_start,'yyyy-MM-dd'), day)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                response => 
                {
                    this.utilizationsub = response;
                },
                error =>
                {
                    throw error;
                }
            ); 
    }

    /**
     * open week picker
     */
    toggleWeekPicker(e: MouseEvent): void
    {
        e.preventDefault();
        this.openWeekPicker = !this.openWeekPicker;
    }

    /**
     * week picker change event
     */
    getWeek(result: Date): void {
  
        this.week_start = startOfWeek(result, {weekStartsOn: 1});
        this.weektext = format(this.week_start, 'dd-MM-yyyy'); 
        this.getBookingSummary();
    
        this.openWeekPicker = !this.openWeekPicker;
    }
    
    /**
     * get week start day of selected
     */
    getWeekStartDay(): any {
        return format(this.week_start, 'dd');
    }
 
    onBack(): void {
        this.room_filter = false;
    }

    /**
     * update booking fees
     *
     * @param {MouseEvent} e
     */
    updateWidget(): void
    {
        this.openWeekPicker = false;
        this.setCurrentDay();
        this.getBookingSummary();
    }
}

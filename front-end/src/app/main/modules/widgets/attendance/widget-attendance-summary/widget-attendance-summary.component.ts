import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';

import { AuthClient } from 'app/shared/model/authClient';
import { format } from 'date-fns';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'widget-attendance-summary',
    templateUrl: './widget-attendance-summary.component.html',
    styleUrls: ['./widget-attendance-summary.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class WidgetAttendanceSummaryComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    today: string;
    openDatePicker: boolean; 
    daytext: string;
    date: null;
    data: { bookings:number, child_in:number, child_out:number, absent:number, unknown:number };
    selectedRoom: any;
    rooms: any[];
    isSitemanager: boolean;

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

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.today = null;
        this.openDatePicker = false; 
        this.daytext = '';
        this.data = { bookings :0, child_in: 0, child_out:0, absent:0, unknown:0 };
        this.selectedRoom = '';
        this.isSitemanager = true;
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
        
        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.updateAttendance(), 250);
            });

            if(!this._authService.isOwnerPath())
            {
                this.isSitemanager = false;
                this._dashboardService
                    .getUserRooms()
                    .pipe(
                        takeUntil(this._unsubscribeAll),
                        finalize(() => this.widgetLoader = false)
                    )
                    .subscribe(
                        res => 
                        {
                            this.rooms = res['data']; 
                        },
                        error =>
                        {
                            throw error;
                        }
                    ); 
            }
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

    setCurrentDay(){

        this.today = this._authService.getClient() ? DateTimeHelper.now().tz(this._authService.getClient().timeZone).format(AppConst.dateTimeFormats.dateOnly): DateTimeHelper.now().format(AppConst.dateTimeFormats.dateOnly);
        this.daytext = this._authService.getClient() ? DateTimeHelper.now().tz(this._authService.getClient().timeZone).format('DD-MM-YYYY') : DateTimeHelper.now().format('DD-MM-YYYY');

    }

    /**
     * get room attendance
     */
    updateAttendance(): void
    {
        this.widgetLoader = true;

        this._dashboardService
            .getAttendance(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id, this.today, this.selectedRoom)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                res => 
                {
                    this.data = res;
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
    updateWidget(): void
    {
        this.openDatePicker = false;
        this.setCurrentDay();
        this.selectedRoom = '';
        this.updateAttendance();        
    }

     /**
     * open date picker
     */
    toggleDatePicker(e: MouseEvent): void
    {
        e.preventDefault();
        this.openDatePicker = !this.openDatePicker;
    }

    /**
     * date picker change event
     */
    getDayRecords(result: Date): void {
  
        this.today = format(result, 'yyyy-MM-dd');
        this.daytext = format(result, 'dd-MM-yyyy');        
        this.updateAttendance();
    
        this.openDatePicker = !this.openDatePicker;
    }

    /**
     * room picker change event
     */
    getDayRecordsByRoom(result: String): void {

        this.selectedRoom = result;       
        this.updateAttendance();

    }
    
}

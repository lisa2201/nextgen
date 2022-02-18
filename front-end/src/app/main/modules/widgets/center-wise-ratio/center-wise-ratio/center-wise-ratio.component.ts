import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit, Input } from '@angular/core';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { AuthService } from 'app/shared/service/auth.service';
import { DashboardService } from 'app/main/modules/dashboard/services/dashboard.service';

import { AuthClient } from 'app/shared/model/authClient';
import { Router } from '@angular/router';

@Component({
    selector: 'center-wise-ratio',
    templateUrl: './center-wise-ratio.component.html',
    styleUrls: ['./center-wise-ratio.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CenterWiseRatioComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    client: AuthClient;
    widgetTableData: any[];
    totalEducatorsNeeded: any;
    totalEducatorsInAttendance: any;
    educatorsInAttendance: any[];
    is_sitemanager: boolean;
    widgetLoader: boolean;
    errorMessage: string;
    popupVisible: boolean = false;


    @Input() selectedBranch: string;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param _authService
     * @param _dashboardService
     * @param {Router} _router
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _dashboardService: DashboardService,
        private _router: Router
    )
    {
        // set default values
        this.client = this._authService.getClient();
        this.widgetLoader = false;
        this.is_sitemanager = false;
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.widgetTableData = [];
        this.totalEducatorsNeeded = null;
        this.totalEducatorsInAttendance = null;
        this.errorMessage = null;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        if(this._authService.isOwnerPath()){
            this.is_sitemanager = true;
        }

        this._dashboardService
            .onBranchChange
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.selectedBranch = value; 

                setTimeout(() => this.updateCenterWiseRatioWidget(), 250);
            });
            
        this.widgetTableData.sort((a, b) => (a.age_start > b.age_start) ? 1 : -1);
    }

    ngAfterViewInit(): void 
    {
        // initial load
        setTimeout(() => this.updateCenterWiseRatioWidget(), 250);
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
     * get waitlist data
     */
    updateCenterWiseRatioWidget():void{

        this.widgetLoader = true;

        this._dashboardService
            .getCenterWiseRatio(this._authService.isOwner() ? this.selectedBranch : this._authService.getClient().id)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.widgetLoader = false)
            )
            .subscribe(
                res => 
                {
                    this._logger.debug('[ccs notifications dashboard]', res);
                    this.widgetTableData = res.data.widget_table;
                    if(this.widgetTableData)
                    {
                        this.widgetTableData.sort((a, b) => (a.age_start > b.age_start) ? 1 : -1);
                        this.readWidgetTable(this.widgetTableData);
                    }
                    // this.totalEducatorsNeeded = res.data.required_total;
                    this.totalEducatorsInAttendance = res.data.current_total;
                    this.educatorsInAttendance = res.data.current_educators;
                    this.errorMessage = res.data.message;
                },
                error =>
                {
                    throw error;
                }
            );

    }

    /**
    * read the widget table and calculate the educators
    * */
    readWidgetTable(table: any): void
    {   // console.log(table);

        this.totalEducatorsNeeded = 0;
        let maxNoOfChildrenAgeGroupEdusCanCareFor = 0;
        let countEarly = 0;
        let ratioEarly = 0;
        let educatorsNeededEarly = 0;
        for(const x in table)
        {
            let ratio = table[x].ratio_display.split(':');
            // if the current count is 0, set the required educator count to 0, and skip this loop.
            if(table[x].count === 0)
            {
                table[x].educators_needed2 = 0;
                continue;
            }

            // current age group's required educator count. calculated by substracting the previous age groups's educators capacity.
            // (previous age group has i children and educator can care for j children. reduce the children count in this age group by (j-i))
            table[x].educators_needed2 = (ratio[0]*(table[x].count - (maxNoOfChildrenAgeGroupEdusCanCareFor - countEarly))/ratio[1] >= 0)? ratio[0]*(table[x].count - (maxNoOfChildrenAgeGroupEdusCanCareFor - countEarly))/ratio[1] : ratio[0]*(table[x].count - (maxNoOfChildrenAgeGroupEdusCanCareFor - countEarly))/ratio[1];
            // console.log(ratio[0]+'* ('+table[x].count+ '- ('+ maxNoOfChildrenAgeGroupEdusCanCareFor + '-' + countEarly+'))/'+ratio[1]);
            /*console.log(ratio[0]+'*('+table[x].count+'-('+educatorsNeededEarly + '*' +ratioEarly+'-'+countEarly+'))'+'/'+ratio[1])
            console.log(table[x].educators_needed2);*/
            educatorsNeededEarly = Math.ceil(table[x].educators_needed2);
            // console.log('educatorsNeededEarly : ' + educatorsNeededEarly);
            ratioEarly = ratio[1]/ratio[0];
            // console.log('ratioEarly : ' + ratioEarly);
            // maximum number of children this agegroup's educators can care for = (this age groups ratio * number of educators needed in this age group) + (previous age groups educators remaining capacity of children)
            maxNoOfChildrenAgeGroupEdusCanCareFor = (educatorsNeededEarly*ratioEarly) + (maxNoOfChildrenAgeGroupEdusCanCareFor - countEarly);
            // console.log('maxNoOfChildrenAgeGroupEdusCanCareFor : '+maxNoOfChildrenAgeGroupEdusCanCareFor);
            countEarly = table[x].count;
            // console.log('countEarly : '+countEarly);
            // console.log('==========================================================================================');
        }
         // console.log(table);

        for(const y in table)
        {
            table[y].educators_needed2 = Math.ceil(table[y].educators_needed2);

            this.totalEducatorsNeeded = this.totalEducatorsNeeded + table[y].educators_needed2;
        }
    }
              
    /**
     * navigate to waitlist page
     *
     * @returns {void}
     */
    navigate(e: MouseEvent): void
    {
        e.preventDefault();
        if(!this._authService.isOwner()){
            this._router.navigate(['bulk-operations/ccs-entitlement-variation'], { queryParams: { ref: 'true' } });
        }
    }

    closePopup(): void {
        this.popupVisible = false;
    }
 
}

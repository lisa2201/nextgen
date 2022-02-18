import { Component, OnInit, ViewEncapsulation, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { Organization } from '../../../Models/organization.model';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { takeUntil } from 'rxjs/operators';
import { OrganizationService } from '../../../services/organization.service';

export interface Status {
    value: string;
    viewValue: string;
}

export interface CreatedAt {
    value: string;
    viewValue: string;
}

// export interface Plan {
//     value: string;
//     viewValue: string;
// }

@Component({
    selector: 'app-organization-left-sidenav',
    templateUrl: './organization-left-sidenav.component.html',
    styleUrls: ['./organization-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})


export class OrganizationLeftSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    organizationList: Organization[];
    filterValue: any = null;
    showFilterButton: boolean;

    filterBy = {
        status: '',
        date: ''
        // plan: ''
    };

    statuses: Status[] = [
        { value: 'email_verification', viewValue: 'Pending Approval' },
        { value: 'pending', viewValue: 'Pending Verification' },
        { value: 'quotation_acceptance', viewValue: 'Pending Quotation' },
        { value: 'active', viewValue: 'Active' },
        { value: 'deactivate', viewValue: 'Not Active' }
    ];

    // plans: Plan[] = [
    //     { value: 'v1', viewValue: 'CCS Subscription plan (Fixed Price)' },
    //     { value: 'v2', viewValue: 'CCS Subscription plan (Custom Price)' },
    //     { value: 'v3', viewValue: 'Parent’s Portal Subscription plan (Fixed Price)' },
    //     { value: 'v4', viewValue: 'Parent’s Portal Subscription plan (Custom Price)' }
    // ];


    @Output()
    updateTableScroll: EventEmitter<any>;

    /**
     * 
     * @param {NGXLogger} _logger 
     * @param {OrganizationService} _organizationService 
     */
    constructor(
        private _logger: NGXLogger,
        private _organizationService: OrganizationService
    ) {
        this.filterBy.status = null;
        this.filterBy.date = null;
        // this.filterBy.plan = null;
        this.showFilterButton = false;
        this.updateTableScroll = new EventEmitter();

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }


    /**
     * On Init
     */
    ngOnInit(): void {
        this._logger.debug('organization left side nav!!!');

        // Subscribe to organization changes
        this._organizationService
            .onOrganizationChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[organizations]', response);

                this.organizationList = response.items;
                // this.total = response.total;
                // this.updateTableScroll.next(50);

            });
    }


    /**
     * On Destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


    /**
     * Change Filter
     */
    changeFilter(): void {
        // this._organizationService.onFilterChanged.next(this.filterBy);
        this._organizationService.filterBy = this.filterBy;
        this._organizationService.getOrganizations();
        this.showFilterButton = true;
    }

    /**
     * Reset Filters
     */
    resetFilters(): void {
        this.filterBy.status = null;
        this.filterBy.date = null;
        // this.filterBy.plan = null;
        this._organizationService.getOrganizations();
        this.showFilterButton = false;
    }


}

import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import {FormGroup, FormControl} from '@angular/forms';
import { Subject } from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';



import { Branch } from 'app/main/modules/branch/branch.model';
import {CcsOperationsService} from '../../ccs-operations.service';
import {DateTimeHelper} from '../../../../../utils/date-time.helper';
import {NotifyType} from '../../../../../shared/enum/notify-type.enum';
import {NotificationService} from '../../../../../shared/service/notification.service';


@Component({
    selector: 'manage-remittance-query-left-sidenav',
    templateUrl: './manage-remittance-query-left-sidenav.component.html',
    styleUrls: ['./manage-remittance-query-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ManageRemittanceQueryLeftSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;
    
    branches: Branch[];
    showFilterButton: boolean;
    userDependencies: any;

    queryFiltersForm: FormGroup;



    resultList: any[];
    startDate: string;
    endDate: string;
    apiData: any;
    buttonLoader: boolean;



    /* share filter data */
    filterData: any;
    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {UsersService} _usersService
     */
    constructor(
        private _logger: NGXLogger,
        private _ccsOperationsService: CcsOperationsService,
        private _notification: NotificationService,
    )
    {
        // Set defaults
        this.branches = [];
        this.showFilterButton = true;
        this.buttonLoader = false;

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
        this._logger.debug('query remittance by CCS Approval left side nav!!!');

        /* share filter data */
        this._ccsOperationsService.currentMessage.subscribe(message => this.filterData = message);

        /* set filter data */
        this.createFilterForm();

        // Subscribe to filter changes
        this._ccsOperationsService.onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[ccsdata]', response);
                this.resultList = response.item;
                // this.lengthChanged.emit(this.ccsList.length);
            });

        this._ccsOperationsService
            .onCcsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                // this._logger.debug('[certificates or determinations]', response);

                this.resultList = response.item;

            });

        this._ccsOperationsService
            .onQueryByFilter
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                this.filter(null);
            });

    }

    filter(ev: MouseEvent | null): void {

        if (ev) {
            ev.preventDefault();
        }

        if (this.fc.datePayedFrom.value && !this.fc.datePayedTo.value) {
            setTimeout(() => this._notification.displaySnackBar('Please Select Date Payed To Value', NotifyType.ERROR), 200);
            return null;
        }
        if (!this.fc.datePayedFrom.value && this.fc.datePayedTo.value)
        {
            setTimeout(() => this._notification.displaySnackBar('Please Select Date Payed From Value', NotifyType.ERROR), 200);
            return null;
        }

        const sendData = {
            startDate: DateTimeHelper.getUtcDate(this.fc.datePayedFrom.value),
            endDate: DateTimeHelper.getUtcDate(this.fc.datePayedTo.value),
            clearingNumber: this.fc.clearingNumber.value,
            paymentLineItem: this.fc.paymentLineItem.value, // SupportingDocuments, // this.fc.supportingDocInput.value,
        };

        this._ccsOperationsService.changeMessage(sendData);
        this._ccsOperationsService.onFilterChanged.next(sendData);

        this._logger.debug(sendData);
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
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.queryFiltersForm.controls;
    }



    createFilterForm(): void
    {
        this.queryFiltersForm = new FormGroup({
            datePayedFrom: new FormControl(null),
            datePayedTo: new FormControl(null),
            clearingNumber: new FormControl(null),
            paymentLineItem: new FormControl(null),
        });
    }

    clearFilter(e: MouseEvent): void
    {
        e.preventDefault();
        this.fc.datePayedFrom.patchValue('');
        this.fc.datePayedTo.patchValue('');
        this.fc.clearingNumber.patchValue('');
        this.fc.paymentLineItem.patchValue('');
    }

   
}


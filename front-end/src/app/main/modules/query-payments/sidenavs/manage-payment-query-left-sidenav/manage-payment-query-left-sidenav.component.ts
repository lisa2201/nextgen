import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import {FormGroup, FormControl, Validators, ValidatorFn, ValidationErrors} from '@angular/forms';
import { Subject } from 'rxjs';
import {finalize, takeUntil} from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations/index';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';



import { Branch } from 'app/main/modules/branch/branch.model';
import { CommonHelper } from 'app/utils/common.helper';
import {CcsOperationsService} from '../../../ccms-operations/ccs-operations.service';
import {DateTimeHelper} from '../../../../../utils/date-time.helper';
import {NotifyType} from '../../../../../shared/enum/notify-type.enum';
import {NotificationService} from '../../../../../shared/service/notification.service';
import {QueryPaymentsService} from '../../services/query-payments.service';
import {ActivatedRoute} from '@angular/router';
import {AuthService} from '../../../../../shared/service/auth.service';
import {AppConst} from '../../../../../shared/AppConst';


@Component({
    selector: 'manage-payment-query-left-sidenav',
    templateUrl: './manage-payment-query-left-sidenav.component.html',
    styleUrls: ['./manage-payment-query-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ManagePaymentQueryLeftSidenavComponent implements OnInit, OnDestroy {

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

    serviceList: any;
    isSiteManager: boolean;

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
        private _ccsOperationsService: QueryPaymentsService,
        private _notification: NotificationService,
        private _route: ActivatedRoute,
        private _authService: AuthService,
    )
    {
        // Set defaults
        this.branches = [];
        this.showFilterButton = true;
        this.buttonLoader = false;
        this.isSiteManager = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this.serviceList = this._route.snapshot.data['services'];
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



        if (this._authService.getUserLevel() === AppConst.roleLevel.OWNER)
        {
            this.isSiteManager = true;
        }


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
                console.log('in component');
                console.log(response.item);

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

        if (this.isSiteManager)
        {
            if (!this.fc.service.value)
            {
                setTimeout(() => this._notification.displaySnackBar('Please Select the Service', NotifyType.WARNING), 200);
                return null;
            }
        }

        const sendData = {
            service: (this.isSiteManager) ? this.fc.service.value : this.serviceList[0].service_id,
            startDate: DateTimeHelper.getUtcDate(this.fc.datePayedFrom.value),
            endDate: DateTimeHelper.getUtcDate(this.fc.datePayedTo.value),
            clearingNumber: this.fc.clearingNumber.value,
            paymentLineItem: this.fc.paymentLineItem.value, // SupportingDocuments, // this.fc.supportingDocInput.value,
        };

        this._ccsOperationsService.changeMessage(sendData);


        this._ccsOperationsService.onFilterChanged.next(sendData);

        console.log(sendData);
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

    /*trackByFn(index: number, item: any): number
    {
        return index;
    }*/

    /**
     * convenience getter for easy access to form fields
     */
    get fc(): any
    {
        return this.queryFiltersForm.controls;
    }

    /*get getFormValues(): any
    {
        return {
            status: this.fc.status.value,
            level: this.fc.level.value,
            branch: this.fc.branch.value,
        };
    }*/

    createFilterForm(): void
    {
        /*return new FormGroup({
            dateInput: new FormControl(),
            clearingNumber: new FormControl('SFJG798709'),
            paymentLineItem: new FormControl('232323')
        });*/
        this.queryFiltersForm = new FormGroup({
            service: new FormControl((this.serviceList.length) ? this.serviceList[0].service_id : null, [Validators.required]),
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

    /*
        setLastRememberOptions(values: any): void
        {
            for (const key in this.fc)
            {
                this.fc[key].patchValue(_.get(values, key), { emitEvent: false });
            }

            this.showFilterButton = true;
        }

        checkClearFilter(): void
        {
            this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
        }

        */
}


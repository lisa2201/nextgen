import { Component, OnInit, ViewEncapsulation, EventEmitter, Output, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { Branch } from 'app/main/modules/branch/branch.model';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import * as isEqual from 'fast-deep-equal';
import { DateTimeHelper } from 'app/utils/date-time.helper';


import { timeUnits } from 'ng-zorro-antd';
import { ProviderNotificationService } from '../../services/provider-notification.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { ProviderSetup } from 'app/main/modules/account-manager/provider-setup/models/provider-setup.model';
import { AccountManagerService } from 'app/main/modules/account-manager/account-manager.service';
import { AuthService } from 'app/shared/service/auth.service';

@Component({
    selector: 'ccs-notification-sidenav',
    templateUrl: './ccs-notification-sidenav.component.html',
    styleUrls: ['./ccs-notification-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CcsNotificationSidenavComponent implements OnInit, OnDestroy {
    // Private
    private _unsubscribeAll: Subject<any>;

    branches: Branch[];
    showFilterButton: boolean;
    providers: ProviderSetup[];
    isSiteManager: boolean;

    filtersForm: FormGroup;

    formDefaultValues = {
        type: null,
        source: null,
        date: null,
    };

    type: any;
    source: any;
    size: string;
    buttonLoader: boolean;

    @Output()
    updateFilterActiveStatus: EventEmitter<boolean>;
    age: any;
    gender: any;
    number_of_days: any;
    number_of_sibilings: number[];


    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param _providerNotificationService
     */
    constructor(
        private _logger: NGXLogger,
        private _providerNotificationService: ProviderNotificationService,
        private _accountManagerService: AccountManagerService,
        private _authService: AuthService
    ) {
        // Set defaults
        this.branches = [];
        this.showFilterButton = false;
        this.filtersForm = this.createFilterForm();
        this.buttonLoader = false;
        this.providers = [];
        this.isSiteManager = this._authService.isOwner();

        // this.setFilterFormDefaults();

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.updateFilterActiveStatus = new EventEmitter();
        this.size = 'large';
        this.type = [
            {
                'value': 'IMMED',
                'name': 'Immediate action required',
            },
            {
                'value': 'ERROR',
                'name': 'An error has occurred',
            },
            {
                'value': 'WARNIG',
                'name': 'Warning only',
            },
            {
                'value': 'INFO',
                'name': 'Information only',
            }
        ]

        this.source = [
            {
                'value': 'ENRCRT',
                'name': 'Enrolment - create',
            },
            {
                'value': 'ENRUPD',
                'name': 'Enrolment - update',
            },
            {
                'value': 'SSRCRT',
                'name': 'Session report - create',
            },
            {
                'value': 'SSRUPD',
                'name': 'Session report – update',
            },
            {
                'value': 'FDCEXM',
                'name': 'FDC Exemption',
            },
            {
                'value': 'ACCTMG',
                'name': 'Account Management',
            },
            {
                'value': 'ACCSCW',
                'name': 'ACCS Child Wellbeing',
            },
            {
                'value': 'PAYMNT',
                'name': 'Payment',
            },
            {
                'value': 'RTNFEE',
                'name': 'Return Fee Reduction',
            },
            {
                'value': 'ENTTLM',
                'name': 'Entitlement',
            },
            {
                'value': 'CAREPV',
                'name': 'Care Provided and Vacancy',
            },
            {
                'value': 'DEBTMG',
                'name': 'Debt Management',
            },
        ]
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // this._logger.debug('side nav!!!');

        if (this.isSiteManager) {
            this.loadProviders();

            this.filtersForm.get('provider').setValidators([Validators.required]);
            this.filtersForm.get('provider').updateValueAndValidity();
        }

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
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
    get fc(): any {
        return this.filtersForm.controls;
    }

    get getFormValues(): any {
        return {
            type: this.fc.type.value,
            source: this.fc.source.value,
            sdate: (this.fc.sdate.value) ? DateTimeHelper.getUtcDate(this.fc.sdate.value) : null,
            edate: (this.fc.edate.value) ? DateTimeHelper.getUtcDate(this.fc.edate.value) : null,
            provider: this.fc.provider.value
        };
    }

    loadProviders(): void {

        this._accountManagerService.getCcsProviders()
            .subscribe((providers: ProviderSetup[]) => {
                this.providers = providers;
            });

    }

    createFilterForm(): FormGroup {
        return new FormGroup({
            provider: new FormControl(null),
            type: new FormControl(null),
            source: new FormControl(null),
            sdate: new FormControl('', [Validators.required]),
            edate: new FormControl('', [Validators.required]),
        });
    }

    setFilterFormDefaults(): void {
        this.filtersForm.get('type').patchValue(null, { emitEvent: false });
        this.filtersForm.get('source').patchValue(null, { emitEvent: false });
        this.filtersForm.get('sdate').patchValue(null, { emitEvent: false });
        this.filtersForm.get('edate').patchValue(null, { emitEvent: false });
        this.filtersForm.get('provider').patchValue(null, { emitEvent: false });

        this.showFilterButton = false;
    }

    checkClearFilter(): boolean {
        return isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void {
        e.preventDefault();

        this.setFilterFormDefaults();

        // update table
        // this._waitListEnrollmentService.onFilterChanged.next(null);
    }

    submitFilter(e: MouseEvent): void {
        e.preventDefault();

        const sendData = {
            type: this.fc.type.value,
            source: this.fc.source.value,
            sDate: DateTimeHelper.getUtcDate(this.fc.sdate.value),
            eDate: DateTimeHelper.getUtcDate(this.fc.edate.value),
            provider_id: this.fc.provider.value
        }

        this._logger.debug('[Send Data]', sendData);

        if (!this.checkClearFilter()) {
            // this._waitListEnrollmentService.onFilterChanged.next(this.getFormValues);
            this._providerNotificationService.onFilterChanged.next(
                sendData
            );
            this.updateFilterActiveStatus.emit(true);
        }
    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, this.fc.sdate.value) < 0;
    };
}
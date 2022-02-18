import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AccountManagerService } from 'app/main/modules/account-manager/account-manager.service';
import { ProviderSetup } from 'app/main/modules/account-manager/provider-setup/models/provider-setup.model';
import { AuthService } from 'app/shared/service/auth.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import * as _ from 'lodash';
import * as isEqual from 'fast-deep-equal';
import { ProviderNotificationService } from '../../../../services/provider-notification.service';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

@Component({
    selector: 'app-correspondence-left-side-nav',
    templateUrl: './correspondence-left-side-nav.component.html',
    styleUrls: ['./correspondence-left-side-nav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CorrespondenceLeftSideNavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    providers: ProviderSetup[];
    isSiteManager: boolean;

    filtersForm: FormGroup;

    formDefaultValues = {
        edate: null,
        sdate: null,
        provider: null,
    };

    buttonLoader: boolean;

    @Output()
    updateFilterActiveStatus: EventEmitter<boolean>;

    constructor(
        private _logger: NGXLogger,
        private _accountManagerService: AccountManagerService,
        private _providerNotificationService: ProviderNotificationService,
        private _authService: AuthService
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.filtersForm = this.createFilterForm();
        this.buttonLoader = false;
        this.providers = [];
        this.isSiteManager = this._authService.isOwner();

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.updateFilterActiveStatus = new EventEmitter();

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

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
            provider: this.fc.provider.value,
            sdate: (this.fc.sdate.value) ? DateTimeHelper.getUtcDate(this.fc.sdate.value) : null,
            edate: (this.fc.edate.value) ? DateTimeHelper.getUtcDate(this.fc.edate.value) : null,
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
            sdate: new FormControl('', [Validators.required]),
            edate: new FormControl('', [Validators.required]),
        });
    }

    setFilterFormDefaults(): void {
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
            sDate: DateTimeHelper.getUtcDate(this.fc.sdate.value),
            eDate: DateTimeHelper.getUtcDate(this.fc.edate.value),
            provider_id: this.fc.provider.value
        }

        this._logger.debug('[Send Data]', sendData);

        if (!this.checkClearFilter()) {
            this._providerNotificationService.onCorrespondenceFilterChanged.next(
                sendData
            );
            this.updateFilterActiveStatus.emit(true);
        }
    }

    disabledDate = (current: Date): boolean => {
        return differenceInCalendarDays.default(current, this.fc.sdate.value) < 0;
    };
}

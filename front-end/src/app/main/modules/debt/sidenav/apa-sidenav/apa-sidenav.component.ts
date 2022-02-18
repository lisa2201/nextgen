import { Component, OnInit, ViewEncapsulation, EventEmitter, Output, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { Branch } from 'app/main/modules/branch/branch.model';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { DebtService } from '../../services/debt.service';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import * as isEqual from 'fast-deep-equal';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { AccountManagerService } from 'app/main/modules/account-manager/account-manager.service';
import { AuthService } from 'app/shared/service/auth.service';
import { ProviderSetup } from 'app/main/modules/account-manager/provider-setup/models/provider-setup.model';

@Component({
    selector: 'apa-left-sidenav',
    templateUrl: './apa-sidenav.component.html',
    styleUrls: ['./apa-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ApaSidenavComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    branches: Branch[];
    showFilterButton: boolean;
    isSiteManager: boolean;
    providers: ProviderSetup[];

    apaFiltersForm: FormGroup;

    formDefaultValues = {
        serviceId: null,
        issuedDate: null
    };

    buttonLoader: boolean;

    @Output()
    updateFilterActiveStatus: EventEmitter<boolean>;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {InvitationService} _debtService
     */
    constructor(
        private _logger: NGXLogger,
        private _debtService: DebtService,
        private _accountManagerService: AccountManagerService,
        private _authService: AuthService
    ) {
        // Set defaults
        this.branches = [];
        this.showFilterButton = false;
        this.apaFiltersForm = this.createFilterForm();
        this.buttonLoader = false;
        this.isSiteManager = this._authService.isOwner();

        this.setFilterFormDefaults();

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
        this._logger.debug('debt left side nav!!!');

        if (this.isSiteManager) {
            this.loadProviders();

            this.apaFiltersForm.get('provider_id').setValidators([Validators.required]);
            this.apaFiltersForm.get('provider_id').updateValueAndValidity();
        }


        // Subscribe to branch list changes
        this._debtService
            .onFilterBranchesChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[filter by service change]', response);

                this.branches = response;

            });

        // Subscribe to view loader changes
        this._debtService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.buttonLoader = value);

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
        return this.apaFiltersForm.controls;
    }

    get getFormValues(): any {
        return {
            provider_id: this.fc.provider_id.value,
            issuedDate: DateTimeHelper.getUtcDate(this.fc.issuedDate.value),
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
            provider_id: new FormControl(null),
            issuedDate: new FormControl('')
        });
    }

    setFilterFormDefaults(): void {
        this.apaFiltersForm.get('provider_id').patchValue(null, { emitEvent: false });
        this.apaFiltersForm.get('issuedDate').patchValue(null, { emitEvent: false });

        this.showFilterButton = false;
    }

    checkClearFilter(): boolean {
        return isEqual(this.formDefaultValues, this.getFormValues);
    }

    clearFilter(e: MouseEvent): void {
        e.preventDefault();

        this.setFilterFormDefaults();

        // update table
        // this._debtService.onFilterChanged.next(null);
    }

    submitFilter(e: MouseEvent): void {
        e.preventDefault();
        if (!this.checkClearFilter()) {

            const sendData = {
                provider_id: this.fc.provider_id.value,
                issued_date: DateTimeHelper.getUtcDate(this.fc.issuedDate.value)
            };

            this._logger.debug('[Send Data]', sendData);

            this._debtService.onFilterChanged.next(sendData);

            this.updateFilterActiveStatus.emit(true);
        }
    }
}
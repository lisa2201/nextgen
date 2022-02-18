import {Component, OnInit, ViewEncapsulation, EventEmitter, Output, OnDestroy} from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { Branch } from 'app/main/modules/branch/branch.model';
import {FormGroup, FormControl, Validators} from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import {first, takeUntil} from 'rxjs/operators';
import * as _ from 'lodash';
import * as isEqual from 'fast-deep-equal';
import { DateTimeHelper } from 'app/utils/date-time.helper';

import { timeUnits } from 'ng-zorro-antd';
import {CcsEntitlementHistoryService} from '../services/ccs-entitlement-history.service';
import {Child} from '../../child/child.model';
import {ChildrenService} from '../../child/services/children.service';
import {NotifyType} from '../../../../shared/enum/notify-type.enum';
import {ActivatedRoute} from '@angular/router';
import {AppConst} from '../../../../shared/AppConst';

@Component({
  selector: 'ccs-entitlement-history-sidenav',
  templateUrl: './ccs-entitlement-history-sidenav.component.html',
  styleUrls: ['./ccs-entitlement-history-sidenav.component.scss']
})
export class CcsEntitlementHistorySidenavComponent implements OnInit, OnDestroy {
// Private
    private _unsubscribeAll: Subject<any>;

    branches: Branch[];
    showFilterButton: boolean;

    filtersForm: FormGroup;

    formDefaultValues = {
        child: null,
        source: null,
        date: null,
    };

    child: any;
    source: any;
    size: string;
    buttonLoader: boolean;

    @Output()
    updateFilterActiveStatus: EventEmitter<boolean>;
  age: any;
  gender: any;
  number_of_days: any;
  number_of_sibilings: number[];

   childrenList: Child[];


    /**
     * Constructor
     *
     * @param {NGXLogger} _logger
     * @param _ccsEntitlementHistoryService
     * @param _childrenService
     * @param _route
     */
    constructor(
        private _logger: NGXLogger,
        private _ccsEntitlementHistoryService: CcsEntitlementHistoryService,
        private _childrenService: ChildrenService,
        private _route: ActivatedRoute,
    ) {
        // Set defaults
        this.branches = [];
        this.showFilterButton = false;
        this.filtersForm = this.createFilterForm();
        this.buttonLoader = false;

        // this.setFilterFormDefaults();

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.updateFilterActiveStatus = new EventEmitter();
        this.size = 'large';

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

        this._childrenService
            .getChildrenList()
            .pipe(first())
            .subscribe(
                (response: Child[]) =>
                {
                    this.childrenList = response;


                },
            );
        if(this._route.snapshot.queryParams['ref'])
        {
            if(this._route.snapshot.queryParams['ref'] === 'day')
            {
                this.setFilterFormDefaults();
                this.filtersForm.get('date').patchValue(DateTimeHelper.getUtcDate(new Date()), { emitEvent: false });
                this.filtersForm.get('endDate').patchValue(DateTimeHelper.getUtcDate(new Date()), { emitEvent: false });
                this.filtersForm.get('showVariationsOnly').patchValue(true, { emitEvent: false });
                this.filtersForm.get('child').patchValue(['ServiceID'], { emitEvent: false });
                this.submitFilter(null);
            }
            else if(this._route.snapshot.queryParams['ref'] === 'week')
            {
                this.setFilterFormDefaults();
                this.filtersForm.get('date').patchValue(DateTimeHelper.thisWeek().start.format(AppConst.dateTimeFormats.dateOnly), { emitEvent: false});
                this.filtersForm.get('endDate').patchValue(DateTimeHelper.thisWeek().end.format(AppConst.dateTimeFormats.dateOnly), { emitEvent: false});
                this.filtersForm.get('showVariationsOnly').patchValue(true, { emitEvent: false });
                this.filtersForm.get('child').patchValue(['ServiceID'], { emitEvent: false });
                this.submitFilter(null);
            }
        }
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._ccsEntitlementHistoryService.unsubscribeOptions();
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
            child: this.fc.child.value,
            showVariationsOnly: this.fc.showVariationsOnly.value,
            includeYTDAbsenceChanges: this.fc.includeYTDAbsenceChanges.value,
            date: (this.fc.date.value) ? DateTimeHelper.getUtcDate(this.fc.date.value[0]) : null,
            endDate: (this.fc.endDate.value) ? DateTimeHelper.getUtcDate(this.fc.endDate.value[0]) : null,
          };
    }

    createFilterForm(): FormGroup {
        return new FormGroup({
            child: new FormControl(null),
            showVariationsOnly: new FormControl(false),
            includeYTDAbsenceChanges: new FormControl(false),
            date: new FormControl('', null),
            endDate: new FormControl('', null),
        });
    }

    setFilterFormDefaults(): void {
        this.filtersForm.get('child').patchValue(null, { emitEvent: false });
        this.filtersForm.get('showVariationsOnly').patchValue(false, { emitEvent: false });
        this.filtersForm.get('includeYTDAbsenceChanges').patchValue(false, { emitEvent: false });
        this.filtersForm.get('date').patchValue(null, { emitEvent: false });
        this.filtersForm.get('endDate').patchValue(null, { emitEvent: false });

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
        if(e)
            e.preventDefault();

        const sendData = {
            child: this.fc.child.value,
            date: DateTimeHelper.getUtcDate(this.fc.date.value),
            endDate: DateTimeHelper.getUtcDate(this.fc.endDate.value),
            showVariationsOnly: this.fc.showVariationsOnly.value,
            includeYTDAbsenceChanges: this.fc.includeYTDAbsenceChanges.value,
        }
        if(this._route.snapshot.queryParams['branch'])
        {
            sendData['branch'] = this._route.snapshot.queryParams['branch'];
        }
        if (!this.checkClearFilter()) {
            // this._waitListEnrollmentService.onFilterChanged.next(this.getFormValues);
            this._ccsEntitlementHistoryService.onFilterChanged.next(
                sendData
            );
            this.updateFilterActiveStatus.emit(true);
        }
    }

    downloadPdf(theme, isPdf): void{

        /*if (!this.fc.child.value) {
            setTimeout(() => this._notification.displaySnackBar('Please Select a Child', NotifyType.ERROR), 200);
            return null;
        }*/

        const sendData = {
            // service: (this.isSiteManager) ? this.fc.service.value : this.serviceList[0].service_id,
            child: this.fc.child.value,
            date: DateTimeHelper.getUtcDate(this.fc.date.value),
            endDate: DateTimeHelper.getUtcDate(this.fc.endDate.value),
            showVariationsOnly: this.fc.showVariationsOnly.value,
            includeYTDAbsenceChanges: this.fc.includeYTDAbsenceChanges.value,
        };
       // this._ccsEntitlementHistoryService.changeMessage(sendData);
        this._ccsEntitlementHistoryService.setEvents();

        /*this.buttonLoaderDownload = true;
        this.buttonLoading = true;*/

        this._ccsEntitlementHistoryService.onFilterChangedReport.next(sendData);

        this._ccsEntitlementHistoryService
            .getDataForReport({ },isPdf)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                message => {
                    /*this.buttonLoaderDownload = false;
                    this.buttonLoading = false;
                    this._notification.clearSnackBar();*/

                },
                error => {

                    /*this.buttonLoading = false;
                    this.buttonLoaderDownload = false;*/
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }
}
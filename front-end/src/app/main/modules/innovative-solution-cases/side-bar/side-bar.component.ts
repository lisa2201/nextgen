import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { Branch } from '../../branch/branch.model';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from 'app/shared/service/auth.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { QueryMessageService } from '../../message/service/message.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil, take } from 'rxjs/operators';
import { AppConst } from 'app/shared/AppConst';
import { differenceInCalendarDays, isEqual } from 'date-fns';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { CommonHelper } from 'app/utils/common.helper';
import { InnovativeSolutionCasesService } from '../service/innovative-solution-cases.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'innovative-solution-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InnovativeSolutionCasesSideBarComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    buttonLoader: boolean;
    tableLoader: boolean;

    isCaseFilterForm: FormGroup;
    statuses: {name: string, value: string}[];
    isCaseTypes: {name: string, value: string}[];

    formDefaultValues = {
        start_date_from: null,
        start_date_to: null,
        end_date_from: null,
        end_date_to: null,
        case_id: null,
    };

    serviceList: any;
    isSiteManager: boolean;

    constructor(
        private _logger: NGXLogger,
        private _innovativeSolutionCaseService: InnovativeSolutionCasesService,
        private _route: ActivatedRoute,
        private _authService: AuthService,
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.buttonLoader = false;
        this.tableLoader = false;

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
    ngOnInit(): void {

        this._logger.debug('case filter left side nav!!!');


        if (this._authService.getUserLevel() === AppConst.roleLevel.OWNER)
        {
            this.isSiteManager = true;
        }

        this.isCaseFilterForm = this.createFilterForm();

        this.setFilterFormDefaults();

        this._innovativeSolutionCaseService.filterData
            .pipe(
                take(1),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value) => {

                if (!value) {
                    return;
                }
                
                if (value.start_date_to) {
                    this.isCaseFilterForm.get('start_date_to').patchValue(value.start_date_to, { emitEvent: false });
                }
                if (value.start_date_from) {
                    this.isCaseFilterForm.get('start_date_from').patchValue(value.start_date_from, { emitEvent: false });
                }
                
                if (value.end_date_from) {
                    this.isCaseFilterForm.get('end_date_from').patchValue(value.end_date_from, { emitEvent: false });
                }
                if (value.end_date_to) {
                    this.isCaseFilterForm.get('end_date_to').patchValue(value.end_date_to, { emitEvent: false });
                }

                if (value.case_id) {
                    this.isCaseFilterForm.get('case_id').patchValue(value.case_id, { emitEvent: false });
                }
            });
        
        // Subscribe to loader changes
        this._innovativeSolutionCaseService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: boolean) => {
                this.buttonLoader = response;
            });
        
        this._innovativeSolutionCaseService
            .onQueryByFilter
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                this.queryData(null);
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        // this._innovativeSolutionCaseService.unsubscribeOptions();

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    get fc(): any {
        return this.isCaseFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            start_date_to: this.fc.start_date_to.value,
            start_date_from: this.fc.start_date_from.value,
            end_date_from: this.fc.end_date_from.value,
            end_date_to: this.fc.end_date_to.value,
            case_id: this.fc.case_id.value,
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            service: new FormControl((this.serviceList.length) ? this.serviceList[0].service_id : null, [Validators.required]),
            start_date_to: new FormControl(null, [Validators.required]),
            start_date_from: new FormControl(null, [Validators.required]),
            end_date_from: new FormControl(null, [Validators.required]),
            end_date_to: new FormControl(null, [Validators.required]),
            case_id: new FormControl(null),
            
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.isCaseFilterForm.get('start_date_to').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('start_date_from').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('end_date_from').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('end_date_to').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('case_id').patchValue(null, { emitEvent: false });
        this.showFilterButton = false;
    }

    /**
     * Set reset filter
     */
    checkClearFilter(): void {
        this.showFilterButton = !CommonHelper.isEqual(this.formDefaultValues, this.getFormValues);
    }

    /**
     * Clear filter
     * @param {MouseEvent} e 
     */
    clearFilter(e: MouseEvent): void {
        e.preventDefault();

        this.setFilterFormDefaults();

    }

    queryData(event: MouseEvent| null): void {

        if (event) {
            event.preventDefault();
        }

        this._logger.debug('object', this.isCaseFilterForm);

        const filterObj = {
            service: (this.isSiteManager) ? this.fc.service.value : this.serviceList[0].service_id,
            start_date_to: DateTimeHelper.getUtcDate(this.fc.start_date_to.value),
            start_date_from: DateTimeHelper.getUtcDate(this.fc.start_date_from.value),
            end_date_from: DateTimeHelper.getUtcDate(this.fc.end_date_from.value),
            end_date_to: DateTimeHelper.getUtcDate(this.fc.end_date_to.value),
            case_id: this.fc.case_id.value,
        };

        this._innovativeSolutionCaseService.filterBy = filterObj;
        this._innovativeSolutionCaseService.resetPagination();

        this._innovativeSolutionCaseService.listISCases(null);

        // console.log('object', filterObj);
        // this._innovativeSolutionCaseService.onFilterChanged.next(filterObj);

    }

}

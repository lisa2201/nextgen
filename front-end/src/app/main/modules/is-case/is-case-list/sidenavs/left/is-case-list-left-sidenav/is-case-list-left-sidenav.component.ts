import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { takeUntil, take } from 'rxjs/operators';
import * as _ from 'lodash';
import { CommonHelper } from 'app/utils/common.helper';
import { IsCaseService } from 'app/main/modules/is-case/services/is-case.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-is-case-list-left-sidenav',
    templateUrl: './is-case-list-left-sidenav.component.html',
    styleUrls: ['./is-case-list-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class IsCaseListLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    buttonLoader: boolean;
    tableLoader: boolean;

    isCaseFilterForm: FormGroup;
    statuses: {name: string, value: string}[];
    isCaseTypes: {name: string, value: string}[];

    formDefaultValues = {
        status: null,
        start_date: null,
        end_date: null,
        case_id: null,
        case_type: null
    };


    constructor(
        private _logger: NGXLogger,
        private _isCaseService: IsCaseService
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.buttonLoader = false;
        this.tableLoader = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this._logger.debug('is case filter left side nav!!!');

        this.setStatuses();

        this.setIsCaseTypes();

        this.isCaseFilterForm = this.createFilterForm();

        this.setFilterFormDefaults();

        this._isCaseService.filterData
            .pipe(
                take(1),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value) => {

                if (!value) {
                    return;
                }

                if (value.status) {
                    this.isCaseFilterForm.get('status').patchValue(value.status, { emitEvent: false });
                }
                
                if (value.start_date) {
                    this.isCaseFilterForm.get('start_date').patchValue(value.start_date, { emitEvent: false });
                }
                
                if (value.end_date) {
                    this.isCaseFilterForm.get('end_date').patchValue(value.end_date, { emitEvent: false });
                }

                if (value.case_id) {
                    this.isCaseFilterForm.get('case_id').patchValue(value.case_id, { emitEvent: false });
                }

                if (value.case_type) {
                    this.isCaseFilterForm.get('case_type').patchValue(value.case_type, { emitEvent: false });
                }
            });
        
        // Subscribe to loader changes
        this._isCaseService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: boolean) => {
                this.tableLoader = response;
            });

        this._isCaseService
            .onISCaseQueryByFilter
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

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    get fc(): any {
        return this.isCaseFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            date: this.fc.date.value,
            start_date: this.fc.start_date.value,
            end_date: this.fc.end_date.value,
            case_id: this.fc.case_id.value,
            case_type: this.fc.case_type.value
        };
    }

    setStatuses(): void {
        this.statuses = [
            {
                name: 'Approved',
                value: 'Approved'
            },
            {
                name: 'Cancelled',
                value: 'Cancelled'
            },
            {
                name: 'Created In Error',
                value: 'Created In Error'
            },
            {
                name: 'Duplicate',
                value: 'Duplicate'
            },
            {
                name: 'Inactive',
                value: 'Inactive'
            },
            {
                name: 'Not Approved',
                value: 'Not Approved'
            },
            {
                name: 'Pending',
                value: 'Pending'
            },
            {
                name: 'Ready for Approval',
                value: 'Ready for Approval'
            },
            {
                name: 'Started',
                value: 'Started'
            },
            {
                name: 'Submit for Approval',
                value: 'Submit for Approval'
            },
            {
                name: 'Submit for Endorsement',
                value: 'Submit for Endorsement'
            },
            {
                name: 'Varied',
                value: 'Varied'
            },
            {
                name: 'Waitlisted',
                value: 'Waitlisted'
            },
            {
                name: 'Withdrawn',
                value: 'Withdrawn'
            }
        ];
    }

    setIsCaseTypes(): void {
        this.isCaseTypes = [
            {
                name: 'IDF Subsidy',
                value: 'IDF Subsidy'
            },
            {
                name: 'Immediate/Time-Limited',
                value: 'Immediate/Time-Limited'
            },
            {
                name: 'FDC Top Up',
                value: 'FDC Top Up'
            },
            {
                name: 'Inclusion Support - IHC',
                value: 'Inclusion Support - IHC'
            }
        ];
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            status: new FormControl(null),
            start_date: new FormControl(null),
            end_date: new FormControl(null),
            case_id: new FormControl(null),
            case_type: new FormControl(null)
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.isCaseFilterForm.get('status').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('start_date').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('end_date').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('case_id').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('case_type').patchValue(null, { emitEvent: false });
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

    queryData(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        const filterObj = {
            status: this.fc.status.value,
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            case_id: this.fc.case_id.value,
            case_type: this.fc.case_type.value
        };

        this._isCaseService.onFilterChanged.next(filterObj);

    }

}

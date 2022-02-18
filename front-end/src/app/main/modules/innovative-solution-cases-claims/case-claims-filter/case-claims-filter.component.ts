import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Subject } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { InnovativeSolutionCasesClaimsService } from '../service/innovative-solution-case-claims.service';
import { take, takeUntil } from 'rxjs/operators';
import { CommonHelper } from 'app/utils/common.helper';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'innovative-case-claims-filter',
  templateUrl: './case-claims-filter.component.html',
  styleUrls: ['./case-claims-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class InnovativeCaseClaimsFilterComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    buttonLoader: boolean;
    tableLoader: boolean;

    isCaseFilterForm: FormGroup;
    statuses: {name: string, value: string}[];
    isCaseTypes: {name: string, value: string}[];

    formDefaultValues = {
        updated_since: null,
        case_id: null,
        case_claim_id: null,
        status: null,
    };


    constructor(
        private _logger: NGXLogger,
        private _innovativeSolutionCaseClaimsService: InnovativeSolutionCasesClaimsService,
        private _router: Router,
        private _route: ActivatedRoute
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

        this._logger.debug('case filter left side nav!!!');

        this.setStatuses();
        this.isCaseFilterForm = this.createFilterForm();

        this.setFilterFormDefaults();

        this._innovativeSolutionCaseClaimsService.filterData
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
        this._innovativeSolutionCaseClaimsService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: boolean) => {
                this.buttonLoader = response;
            });

        this._innovativeSolutionCaseClaimsService
            .onQueryByFilter
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                this.queryData(null);
            });

        setTimeout(() => {

            if (this._route.snapshot.queryParamMap.has('caseId') && this._route.snapshot.queryParamMap.get('caseId')) {
                this.filterById(this._route.snapshot.queryParamMap.get('caseId'));
            }

        }, 200);

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

    setStatuses(): void {
        this.statuses = [
            {
                name: 'Draft',
                value: 'Draft'
            },
            {
                name: 'Ready for Submission',
                value: 'Ready for Submission'
            },
            {
                name: 'Submitted',
                value: 'Submitted'
            },
            {
                name: 'Processed',
                value: 'Processed'
            },
            {
                name: 'Rejected',
                value: 'Rejected'
            },
            {
                name: 'Cancellation Required',
                value: 'Cancellation Required'
            },
            {
                name: 'Cancelled',
                value: 'Cancelled'
            },
            {
                name: 'Ready for Approval',
                value: 'Ready for Approval'
            },
            {
                name: 'Rejected Late Submission',
                value: 'Rejected Late Submission'
            },
            
        ];
    }

    get fc(): any {
        return this.isCaseFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            updated_since: this.fc.updated_since.value,
            case_id: this.fc.case_id.value,
            case_claim_id: this.fc.case_claim_id.value,
            status: this.fc.status.value,
        };
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            updated_since: new FormControl(null),
            case_id: new FormControl(null),
            case_claim_id: new FormControl(null),
            status: new FormControl(null),
            
        });
    }

    filterById(caseId: string): void {

        if (caseId) {
            
            this._logger.debug('[Filter by case ID]', caseId);
            
            this.isCaseFilterForm.get('case_id').patchValue(caseId, {emitEvent: false});

            this.queryData(null);
            
            setTimeout(() => {
                this._router.navigate([], { replaceUrl: true});
            }, 200);

        } 

    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.isCaseFilterForm.get('updated_since').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('status').patchValue(null, { emitEvent: false });
        this.isCaseFilterForm.get('case_claim_id').patchValue(null, { emitEvent: false });
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

    queryData(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        this._logger.debug('object', this.isCaseFilterForm);

        const filterObj = {
            updated_since: DateTimeHelper.getUtcDate(this.fc.updated_since.value),
            status: this.fc.status.value,
            case_claim_id: this.fc.case_claim_id.value,
            case_id: this.fc.case_id.value,
        };

        this._innovativeSolutionCaseClaimsService.filterBy = filterObj;
        this._innovativeSolutionCaseClaimsService.resetPagination();

        this._innovativeSolutionCaseClaimsService.listISCases(null);

    }


}

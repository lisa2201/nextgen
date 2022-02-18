import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { IsCaseService } from 'app/main/modules/is-case/services/is-case.service';
import { take, takeUntil } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as moment from 'moment';
import { setHours } from 'date-fns';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-is-case-claim-list-left-sidenav',
    templateUrl: './is-case-claim-list-left-sidenav.component.html',
    styleUrls: ['./is-case-claim-list-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class IsCaseClaimListLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    buttonLoader: boolean;
    tableLoader: boolean;

    isCaseClaimFilterForm: FormGroup;
    statuses: {name: string, value: string}[];
    isCaseTypes: {name: string, value: string}[];

    timeDefaultValue = setHours(new Date(), 0);

    formDefaultValues = {
        status: null,
        claim_id: null,
        case_id: null,
        claim_ref: null,
        week_ending: null,
        case_type: null,
        updated_since: null
    };

    constructor(
        private _logger: NGXLogger,
        private _isCaseService: IsCaseService,
        private _route: ActivatedRoute,
        private _router: Router
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

        this._logger.debug('is case claim filter left side nav!!!');

        this.setStatuses();

        this.setIsCaseTypes();

        this.isCaseClaimFilterForm = this.createFilterForm();

        this._isCaseService.isCaseClaimsFilterData
            .pipe(
                take(1),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((value) => {

                if (!value) {
                    return;
                }

                if (value.status) {
                    this.isCaseClaimFilterForm.get('status').patchValue(value.status, { emitEvent: false });
                }
                
                if (value.claim_id) {
                    this.isCaseClaimFilterForm.get('claim_id').patchValue(value.claim_id, { emitEvent: false });
                }
                
                if (value.claim_reference) {
                    this.isCaseClaimFilterForm.get('claim_ref').patchValue(value.claim_reference, { emitEvent: false });
                }

                if (value.case_id) {
                    this.isCaseClaimFilterForm.get('case_id').patchValue(value.case_id, { emitEvent: false });
                }

                if (value.week_ending) {
                    this.isCaseClaimFilterForm.get('week_ending').patchValue(value.week_ending, { emitEvent: false });
                }

                if (value.updated_since) {
                    this.isCaseClaimFilterForm.get('updated_since').patchValue(value.updated_since, { emitEvent: false });
                }

                if (value.case_type) {
                    this.isCaseClaimFilterForm.get('case_type').patchValue(value.case_type, { emitEvent: false });
                }
            });
        
        // Subscribe to loader changes
        this._isCaseService
            .onISCaseClaimsTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: boolean) => {
                this.tableLoader = response;
            });
        
        this._isCaseService
            .onISCaseClaimsQueryByFilter
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

    get fc(): any {
        return this.isCaseClaimFilterForm.controls;
    }

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
                name: 'Rejected Late Submission',
                value: 'Rejected Late Submission'
            }
        ];
    }

    setIsCaseTypes(): void {
        this.isCaseTypes = [
            {
                name: 'ISS',
                value: 'ISS'
            },
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
            claim_id: new FormControl(null),
            claim_ref: new FormControl(null),
            case_id: new FormControl(null),
            week_ending: new FormControl(null),
            case_type: new FormControl(null),
            updated_since: new FormControl(null)
        });
    }

    disabledEndDate = (date: Date): boolean => {
        return date.getDay() === 0 ? false : true;
    }

    filterById(caseId: string): void {

        if (caseId) {
            
            this._logger.debug('[Filter by case ID]', caseId);
            
            this.isCaseClaimFilterForm.get('case_id').patchValue(caseId, {emitEvent: false});

            this.queryData(null);
            
            setTimeout(() => {
                this._router.navigate([], { replaceUrl: true});
            }, 200);

        } 

    }

    queryData(event: MouseEvent | null): void {

        if (event) {
            event.preventDefault();
        }

        const filterObj = {
            status: this.fc.status.value,
            claim_id: this.fc.claim_id.value,
            claim_reference: this.fc.claim_ref.value,
            case_id: this.fc.case_id.value,
            week_ending: DateTimeHelper.getUtcDate(this.fc.week_ending.value),
            case_type: this.fc.case_type.value,
            updated_since: this.fc.updated_since.value ? moment(this.fc.updated_since.value).format('YYYY-MM-DDTHH:mm:ss') : null
        };

        this._logger.debug('[Filter Object]', filterObj);

        this._isCaseService.onISCaseClaimsFilterChanged.next(filterObj);
        this._isCaseService.onISCaseClaimSubmissionsFilterChanged.next(filterObj);

    }
}

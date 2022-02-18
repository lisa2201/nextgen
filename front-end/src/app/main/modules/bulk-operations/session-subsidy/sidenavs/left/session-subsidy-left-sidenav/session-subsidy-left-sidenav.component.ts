import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { SessionSubsidyService } from '../../../services/session-subsidy.service';
import { NGXLogger } from 'ngx-logger';
import { takeUntil, finalize } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { Child } from 'app/main/modules/child/child.model';
import * as _ from 'lodash';

@Component({
    selector: 'app-session-subsidy-left-sidenav',
    templateUrl: './session-subsidy-left-sidenav.component.html',
    styleUrls: ['./session-subsidy-left-sidenav.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class SessionSubsidyLeftSidenavComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    showFilterButton: boolean;
    sessionSubsidyFilterForm: FormGroup;
    tableLoader: boolean;
    children: Child[];
    downloadLoader: boolean;

    constructor(
        private _sessionSubsidyService: SessionSubsidyService,
        private _logger: NGXLogger,
        private _route: ActivatedRoute
    ) {
        // Set defaults
        this.showFilterButton = false;
        this.sessionSubsidyFilterForm = this.createFilterForm();
        this.tableLoader = false;
        this.downloadLoader = false;

        this.setFilterFormDefaults();

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

        this._logger.debug('session subsidy left side nav!!!');

        setTimeout(() => {
            this.children = this._route.snapshot.data?.resolveData ? this._route.snapshot.data.resolveData : [];
        }, 200);

        // Subscribe to filter changes
        // this.ccsEntitlementFilterForm
        //     .get('start_date')
        //     .valueChanges
        //     .pipe(
        //         takeUntil(this._unsubscribeAll)
        //     )
        //     .subscribe(value => {
                
        //         this.ccsPaymentsFilterForm.get('end_date').patchValue(null, {emitEvent: false});

        //     });

        this.sessionSubsidyFilterForm
            .get('enrolment_id')
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(value => {
                
                this.sessionSubsidyFilterForm.get('end_date').patchValue(null, {emitEvent: false});

            });

        this._sessionSubsidyService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.tableLoader = value;
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
        return this.sessionSubsidyFilterForm.controls;
    }

    get getFormValues(): any {
        return {
            start_date: DateTimeHelper.getUtcDate(this.fc.start_date.value),
            end_date: DateTimeHelper.getUtcDate(this.fc.end_date.value),
            enrolment_id: this.fc.enrolment_id.value
        };
    }

    getLabel(child: Child): string {
        return `${child.getFullName()}`;
    }

    getValue(child: Child): string {
        return _.first(child.enrollments).enrolId;
    }

    /**
     * Create filter form
     */
    createFilterForm(): FormGroup {
        return new FormGroup({
            start_date: new FormControl(null, [Validators.required]),
            end_date: new FormControl(null, [Validators.required]),
            enrolment_id: new FormControl(null)
        });
    }

    /**
     * Set form defaults
     */
    setFilterFormDefaults(): void {
        this.sessionSubsidyFilterForm.get('start_date').patchValue(null, { emitEvent: false });
        this.sessionSubsidyFilterForm.get('end_date').patchValue(null, { emitEvent: false });
        this.sessionSubsidyFilterForm.get('enrolment_id').patchValue(null, { emitEvent: false });
    }

    disabledStartDate = (date: Date): boolean => {

        const invalidStart = moment(date).isBefore(moment('2018-07-02'));
        const invalidDay = date.getDay() === 1 ? false : true;

        return invalidStart || invalidDay;
    }

    disabledEndDate = (date: Date): boolean => {

        const invalidDay = date.getDay() === 0 ? false : true;
        const invalidStartDate =  moment(date).isSameOrBefore(moment(this.fc.start_date.value));
        let invalidEndDate: boolean;

        if (this.fc.enrolment_id.value) {
            invalidEndDate = moment(date).isAfter(moment(this.fc.start_date.value).add(12, 'weeks'));
        } else {
            invalidEndDate = moment(date).isAfter(moment(this.fc.start_date.value).add(2, 'weeks'));
        }

        return invalidDay || invalidStartDate || invalidEndDate;
    }

    queryData(event: MouseEvent): void {

        event.preventDefault();
        
        this._sessionSubsidyService.onFilterChanged.next(this.getFormValues);

    }

    downloadCsv(event: MouseEvent): void {

        event.preventDefault();

        this.downloadLoader = true;
    
        this._sessionSubsidyService.downloadCsv(this.getFormValues)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.downloadLoader = false;
                })
            )
            .subscribe((response) => {
                window.open(response);
            });

    }

}

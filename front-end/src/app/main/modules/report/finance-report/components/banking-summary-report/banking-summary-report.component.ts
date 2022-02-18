import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { differenceInCalendarDays } from 'date-fns';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { FinanceReportservice } from '../../../service/finance-report.service';
import * as _ from 'lodash';
import { User } from 'app/main/modules/user/user.model';

@Component({
    selector: 'app-banking-summary-report',
    templateUrl: './banking-summary-report.component.html',
    styleUrls: ['./banking-summary-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BankingSummaryReportComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    @Input() reportType: string;

    filterForm: FormGroup;
    buttonLoader: boolean;
    userList: User[];
    reportList: [];
    totals: any;

    constructor(
        private _financeReportService: FinanceReportservice,
        private _fuseSidebarService: FuseSidebarService,
        private _logger: NGXLogger,
    ) {

        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;

        this.filterForm = this.createFilterForm();
        this.reportList = [];
        this.totals = {};

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {

        this._financeReportService
            .onUserAccountsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((users: User[]) => {
                this._logger.debug('[report filter view]', users);
                this.filterForm.get('user').reset();
                this.userList = users;
            });

        this.filterForm.get('sdate')
            .valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this.startDateHandler(value);
            });

        this._financeReportService
            .onReportChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report-data]', response);
                this.reportList = response?.records?.list || [];
                this.totals = response?.records?.totals || {};
            });

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number {
        return index;
    }

    get fc(): any {
        return this.filterForm.controls;
    }

    get getFormValues(): any {
        return {
            type: this.fc.type.value,
            sdate: DateTimeHelper.getUtcDate(this.fc.sdate.value),
            edate: DateTimeHelper.getUtcDate(this.fc.edate.value),
            user: this.fc.user.value,
            date_type: this.fc.date_type.value
        };
    }

    toggleSidebar(name: string): void {
        this._fuseSidebarService.getSidebar(name).toggleOpen();
    }

    toggleSelectAllUser(value: boolean): void {

        if (value === true) {
            this.filterForm.get('user').patchValue(_.map(this.userList, 'id'), { emitEvent: false });
        } else {
            this.filterForm.get('user').patchValue([], { emitEvent: false });
        }

    }

    startDateHandler(value: any): void {

        if (value) { 
            
            const endDateControl = this.filterForm.get('edate');
    
            if (endDateControl.value && DateTimeHelper.parseMoment(value).isSameOrAfter(DateTimeHelper.parseMoment(endDateControl.value))) {
                endDateControl.reset();
            }

        }

    }

    disabledEndDate = (date: Date): boolean => {
        return differenceInCalendarDays(date, this.fc.sdate.value) <= 0;
    }


    createFilterForm(): FormGroup {
        return new FormGroup({
            type: new FormControl(this.reportType),
            sdate: new FormControl(null, [Validators.required]),
            edate: new FormControl(null, [Validators.required]),
            user: new FormControl(null, [Validators.required]),
            date_type: new FormControl(null, [Validators.required]),
        });
    }

    submitReport(event: MouseEvent, view: boolean, isPdf: boolean): void {

        event.preventDefault();

        if (this.filterForm.invalid) {
            return;
        }

        const sendObj = this.getFormValues;
  
        this._logger.debug('[send object]', sendObj);

        this.buttonLoader = true;

        this._financeReportService
            .getBankingSummaryReportData(sendObj,this.reportType, view, isPdf)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe();

    }

}

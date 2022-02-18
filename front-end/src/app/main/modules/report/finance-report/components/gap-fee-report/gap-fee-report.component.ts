import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FinanceReportservice } from '../../../service/finance-report.service';
import * as _ from 'lodash';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { NGXLogger } from 'ngx-logger';
import { User } from 'app/main/modules/user/user.model';
import { finalize, takeUntil } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

@Component({
    selector: 'app-gap-fee-report',
    templateUrl: './gap-fee-report.component.html',
    styleUrls: ['./gap-fee-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class GapFeeReportComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    @Input() reportType: string;

    filterForm: FormGroup;
    userList: User[];
    buttonLoader: boolean;
    reportData: any;

    constructor(
        private _financeReportService: FinanceReportservice,
        private _fuseSidebarService: FuseSidebarService,
        private _logger: NGXLogger,
    ) {

        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;

        this.filterForm = this.createFilterForm();
        this.reportData = [];

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
                this.reportData = response.records ? response.records : [];
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
            user: this.fc.user.value,
            type: this.fc.type.value,
            sdate: DateTimeHelper.getUtcDate(this.fc.sdate.value),
            edate: DateTimeHelper.getUtcDate(this.fc.edate.value),
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

    disabledDateOnlyMonday = (current: Date): boolean => {
        return current.getDay() !== 1;
    };

    disabledDateOnlySunday = (current: Date): boolean => {
        if(this.fc.sdate.value == null)
            return current.getDay() !== 0;
        else
            return differenceInCalendarDays.default(current, this.fc.sdate.value) < 0 || current.getDay() !== 0;
    };

    startDateHandler(value: any): void {

        if (value) { 
            
            const endDateControl = this.filterForm.get('edate');
    
            if (endDateControl.value && DateTimeHelper.parseMoment(value).isSameOrAfter(DateTimeHelper.parseMoment(endDateControl.value))) {
                endDateControl.reset();
            }

        }

    }


    createFilterForm(): FormGroup {
        return new FormGroup({
            type: new FormControl(this.reportType),
            user: new FormControl(null, [Validators.required]),
            sdate: new FormControl(null, [Validators.required]),
            edate: new FormControl(null, [Validators.required])
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
            .getGapFeeReportData(sendObj,this.reportType, view, isPdf)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe();

    }

}

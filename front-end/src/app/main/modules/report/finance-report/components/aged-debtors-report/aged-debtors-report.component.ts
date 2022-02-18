import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Subject } from 'rxjs';
import { FinanceReportservice } from '../../../service/finance-report.service';
import * as _ from 'lodash';
import { User } from 'app/main/modules/user/user.model';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { NGXLogger } from 'ngx-logger';
import { finalize, takeUntil } from 'rxjs/operators';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'app-aged-debtors-report',
    templateUrl: './aged-debtors-report.component.html',
    styleUrls: ['./aged-debtors-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AgedDebtorsReportComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    @Input() reportType: string;

    filterForm: FormGroup;
    userList: User[];
    buttonLoader: boolean;
    buttonLoaderDownload: boolean;
    reportData: any;
    totalRecords: any;

    constructor(
        private _financeReportService: FinanceReportservice,
        private _fuseSidebarService: FuseSidebarService,
        private _logger: NGXLogger
    ) {

        this._unsubscribeAll = new Subject();
        this.buttonLoader = false;
        this.buttonLoaderDownload = false;

        this.filterForm = this.createFilterForm();
        this.reportData = [];

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {

        this._financeReportService
            .onReportChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report-data]', response);
                this.reportData = response.records ? response.records : [];
                this.totalRecords = response.total || 0;
            });

        this._financeReportService
            .onUserAccountsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((financeAccount: User[]) => {
                this._logger.debug('[report-parent-list]', financeAccount);
                this.filterForm.get('user').reset();
                this.userList = financeAccount;
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
            edate: DateTimeHelper.getUtcDate(this.fc.edate.value),
            prepaid: this.fc.prepaid.value,
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

    createFilterForm(): FormGroup {
        return new FormGroup({
            type: new FormControl(this.reportType),
            user: new FormControl(null, [Validators.required]),
            edate: new FormControl(null, [Validators.required]),
            prepaid: new FormControl(false),
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
            .getAgedDebtorsReportData(sendObj,this.reportType, view, isPdf)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => {
                    this.buttonLoader = false;
                })
            )
            .subscribe();

    }

}

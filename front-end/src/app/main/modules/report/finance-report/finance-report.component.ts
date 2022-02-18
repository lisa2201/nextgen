import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { AppConst } from 'app/shared/AppConst';
import { FinanceReportservice } from '../service/finance-report.service';
import { FinanceReportType } from './model/finance-report.model';
import * as _ from 'lodash';

@Component({
    selector: 'report-finance-report',
    templateUrl: './finance-report.component.html',
    styleUrls: ['./finance-report.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class FinanceReportComponent implements OnInit, OnDestroy {

    reportTypes: FinanceReportType[];
    type: string;
    reportTypeEnums = AppConst.financeReportTypes;

    constructor(
        private _financeReportService: FinanceReportservice
    ) {

        this.reportTypes = _.sortBy(this._financeReportService.getReportTypes(), 'name');
        this.type = null;

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {

        
    }

    ngOnDestroy(): void {
        this._financeReportService.unsubscribeOptions();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number {
        return index;
    }

    updateScroll(): void {
        // this._commonService.triggerResize();
    }

    typeChange(event): void {
        this._financeReportService.onReportChanged.next([]);
    }

}

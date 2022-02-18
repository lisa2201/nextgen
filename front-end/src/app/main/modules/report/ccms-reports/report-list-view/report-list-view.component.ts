import { Component, OnInit, ViewEncapsulation, ViewChild, ElementRef } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs/internal/Subject';
import { NGXLogger } from 'ngx-logger';
import * as _ from 'lodash';
import { Enrolment } from 'app/main/modules/child/enrolment/models/enrolment.model';
import { CCMSReportservice } from '../../service/ccms-report.service';

@Component({
    selector: 'ccms-report-list-view',
    templateUrl: './report-list-view.component.html',
    styleUrls: ['./report-list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class CCMSReportListViewComponent implements OnInit {

    @ViewChild('htmlData') htmlData: ElementRef;
    private _unsubscribeAll: Subject<any>;
    enrollmentData: Enrolment[]
    totalRecords: any;
    tableLoading: boolean;
    reportType: string;

    constructor(
        private _ccmsReportService: CCMSReportservice,
        private _logger: NGXLogger,
    ) {
        this._unsubscribeAll = new Subject();
        this.enrollmentData = [];
    }

    ngOnInit() {

        this._ccmsReportService
            .onReportChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {

                this._logger.debug('[report list view-ccms]', response);
                
                this.totalRecords = response.total;
                this.reportType = response.type;
                this.enrollmentData = response.records ? response.records : []
            });

             // Subscribe to table loader changes
        this._ccmsReportService
        .onTableLoaderChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(value => {
            this._logger.debug('[table loader]', value);

            this.tableLoading = value;
        });

    }

    ngOnDestroy(): void {

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._ccmsReportService.unsubscribeOptions();
        // this._innovativeSolutionCaseService.unsubscribeOptions();

    }

}

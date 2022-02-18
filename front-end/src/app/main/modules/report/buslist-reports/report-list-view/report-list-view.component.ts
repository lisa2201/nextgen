import { Component, OnInit, ViewEncapsulation, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ContactReportservice } from '../../service/contact-report.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs/internal/Subject';
import { NGXLogger } from 'ngx-logger';

import * as _ from 'lodash';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import {BuslistReportService} from '../../service/buslist-report.service';
import {BusAttendanceReportModel} from '../model/bus-attendance-report.model';

@Component({
  selector: 'buslist-report-list-view',
  templateUrl: './report-list-view.component.html',
  styleUrls: ['./report-list-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BuslistReportListViewComponent implements OnInit, OnDestroy {

    @ViewChild('htmlData') htmlData:ElementRef;
    private _unsubscribeAll: Subject<any>;
    reportList: BusAttendanceReportModel[];
    totalRecords: any;
    field: any = [];
    tableLoading: boolean;
    reportType:string;

  constructor(
        private _buslistReportService: BuslistReportService,
        private _logger: NGXLogger,
    ) 
    {
        this._unsubscribeAll = new Subject();
        this.reportList = [];
        this.field = _buslistReportService.field;
    }

  ngOnInit() {

        this._buslistReportService
            .onReportChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report list view]', response);

                this.reportList = response.records;
                this.totalRecords = response.total;
                this.field = response.selectedField;
                this.reportType = response.type;
            });

            // Subscribe to table loader changes
        this._buslistReportService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

  }

  ngOnDestroy(): void {

    console.log('destoy work');
    
    this.setDefault();
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this._buslistReportService.unsubscribeOptions();

}

  setDefault(): void {
        this.reportList = [];
        this.totalRecords = null;
        this.field = [];
        this.reportType = '';
    }

}

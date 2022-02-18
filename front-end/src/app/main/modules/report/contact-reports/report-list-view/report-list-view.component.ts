import { Component, OnInit, ViewEncapsulation, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ContactReportservice } from '../../service/contact-report.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs/internal/Subject';
import { NGXLogger } from 'ngx-logger';
import { ContactReport } from '../model/contact-report.model';

import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { AppConst } from 'app/shared/AppConst';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { Room } from 'app/main/modules/room/models/room.model';

@Component({
  selector: 'report-list-view',
  templateUrl: './report-list-view.component.html',
  styleUrls: ['./report-list-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ReportListViewComponent implements OnInit, OnDestroy {

    @ViewChild('htmlData') htmlData:ElementRef;
    private _unsubscribeAll: Subject<any>;
    reportList: any[];
    totalRecords: any;
    field: any = [];
    tableLoading: boolean;
    reportType: string;
    contactReport: any[];
    childId: any;
    include_type: boolean;
    primaryPayerReport: Child[];
    room:  any[];

  constructor(
        private _contactReportService: ContactReportservice,
        private _logger: NGXLogger,
    ) 
    {
        this._unsubscribeAll = new Subject();
        this.reportList = [];
        this.primaryPayerReport = [];
        this.contactReport = [];
        this.reportType = '';
        this.field = _contactReportService.field;
        this.childId = null;
        this.include_type = false;
    }

  ngOnInit() {

    
        this._contactReportService
            .onReportChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => {
                this._logger.debug('[report list view]', response);
                this.reportList = response.records;
                this.totalRecords = response.total;
                this.field = response.selectedField;
                this.reportType = response.reportType;
                this.include_type = response.include_type;
                this.room = response.room? response.room : [];

                if(this.reportType === 'CCR')
                {
                    for(const item in this.reportList)
                    {
                        if(this.reportList[item]['id'] === this.childId)
                        {
                            this.reportList[item]['firstName'] = '';
                            this.reportList[item]['middleName'] = '';
                            this.reportList[item]['lastName'] = '';
                        }
                        this.childId = this.reportList[item]['id'];
                    }
                }
                if(this.reportType === AppConst.ContactReportTypes.IPRIMARY_PAYER_REPORT){
                    this.primaryPayerReport = this.reportList.map((i: any, idx:number)=> new Child(i, idx));
                }
            });

            // this._contactReportService
            // .onFieldChanged
            // .pipe(takeUntil(this._unsubscribeAll))
            // .subscribe((response: any) => {
            //     this._logger.debug('[report list view fild]', response);
            //     this.field = response;
            //     this._logger.debug('[report field check]', this.field[0]['name']);
            // });

            // Subscribe to table loader changes
            this._contactReportService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value =>
            {
                this._logger.debug('[table loader]', value);

                this.tableLoading = value;
            });

  }

  getRoomName():string{

    return this.room.join(', ');
  }

  getPrimaryPayer(child: Child){

    return child.parents.filter(v=> v.isPrimaryPayer === true).length > 0 ? (child.parents.find(v=> v.isPrimaryPayer === true).getFullName()) : 'N/A';
  }
  getPrimaryPayerDate(child: Child){

    if (child.parents.filter(v=> v.isPrimaryPayer === true && v.pivotUpdatedAt !== null).length > 0){

        return DateTimeHelper.parseMoment(child.parents.find(v=> v.isPrimaryPayer === true).pivotUpdatedAt).format('DD-MM-YYYY');
    }
    else{
        return 'N/A';
    }
  }
  ngOnDestroy(): void {

      this._unsubscribeAll.next();
      this._unsubscribeAll.complete();
      this.reportList = [];
      this.totalRecords = null;
      this.field = [];
      this._contactReportService.unsubscribeOptions();

    // this._innovativeSolutionCaseService.unsubscribeOptions();

}

}

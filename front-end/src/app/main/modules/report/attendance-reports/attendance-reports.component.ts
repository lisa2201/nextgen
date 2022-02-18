import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import { AttendanceReportservice } from '../service/attendance-report.service';

@Component({
  selector: 'attendance-reports',
  templateUrl: './attendance-reports.component.html',
  styleUrls: ['./attendance-reports.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class AttendanceReportsComponent implements OnInit, OnDestroy{

  constructor(
    private _attendanceReportService: AttendanceReportservice,
    private _logger: NGXLogger,
  ) { }

  ngOnInit() {
    this._logger.debug('[report list view main]');
  }

  ngOnDestroy(): void{

    this._logger.debug('[report list view main destroy]');
    this._attendanceReportService.unsubscribeOptions();
  }

}

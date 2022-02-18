import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { NGXLogger } from 'ngx-logger';
import {BuslistReportService} from '../service/buslist-report.service';

@Component({
  selector: 'buslist-reports',
  templateUrl: './buslist-reports.component.html',
  styleUrls: ['./buslist-reports.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BuslistReportsComponent implements OnInit, OnDestroy{

  constructor(
    private _buslistReportService: BuslistReportService,
    private _logger: NGXLogger,
  ) { }

  ngOnInit() {
    this._logger.debug('[report list view main]');
  }

  ngOnDestroy(): void{

    this._logger.debug('[report list view main destroy]');
    this._buslistReportService.unsubscribeOptions();
  }

}

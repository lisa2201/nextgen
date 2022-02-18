import { Component, Inject, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import { NGXLogger } from 'ngx-logger';
import { helpMotion } from 'ng-zorro-antd';
import { User } from 'app/main/modules/user/user.model';
import {DateTimeHelper} from '../../../../../utils/date-time.helper';
import { StaffIncidentService } from '../../services/staff-incident.service';
import { CommonService } from 'app/shared/service/common.service';

@Component({
  selector: 'app-view-incident',
  templateUrl: './view-incident.component.html',
  styleUrls: ['./view-incident.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
      helpMotion,
      fuseAnimations,
      fadeInOnEnterAnimation({ duration: 1000 }),
      fadeOutOnLeaveAnimation({ duration: 2000 })
  ]
})
export class ViewIncidentComponent implements  OnInit, OnDestroy {
  private _unsubscribeAll: Subject<any>;

  staffList: User[];
  incident: any;
  completedBy: User;
  witnessPerson: User;
  supervisor: User;
  formImages: string[];

  /**
   * Constructor
   *
   * @param {MatDialogRef<ViewIncidentComponent>} matDialogRef
   * @param {NGXLogger} _logger
   * @param {StaffIncidentService} _staffIncidentService
   * @param _data
   */
  constructor(    
    public matDialogRef: MatDialogRef<ViewIncidentComponent>,
    private _logger: NGXLogger,
    private _staffIncidentService: StaffIncidentService,
    private _commonService: CommonService,
    @Inject(MAT_DIALOG_DATA) private _data: any
  ) {
   
    this._unsubscribeAll = new Subject();
    this.incident = _data.incident;    
    this.staffList = _data.staff;

    this.incident = _data.incident;    
    this.completedBy = this.staffList.filter(x => x.id == this.incident.recordedPerson)[0];
    this.witnessPerson = this.staffList.filter(x => x.id == this.incident.witnessPerson)[0];
    this.supervisor = this.staffList.filter(x => x.id == this.incident.supervisor)[0];

    const images = [];
    for (let i = 0; i < this.incident.images.length; i += 3) {
      const chunk = this.incident.images.slice(i, i + 3);
      images.push(chunk);
    }
    this.formImages = images;
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  getage(value: any): any {
    return DateTimeHelper.getDob(value);
  }

  getIncidentImage(image: any): string {
    if (image) {
      return this._commonService.getS3FullLink(image);
    }
  }

}

import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Fee } from 'app/main/modules/centre-settings/fees/model/fee.model';
import { AuthClient } from 'app/shared/model/authClient';
import { AuthService } from 'app/shared/service/auth.service';
import { CommonService } from 'app/shared/service/common.service';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { slideMotion, fadeMotion, NzModalRef, NzModalService } from 'ng-zorro-antd';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { Booking } from '../../../booking/booking.model';
import { ChildBookingService } from '../../../booking/services/booking.service';
import { Child } from '../../../child.model';
import { SessionRoutine, SessionRoutineItem } from '../../../enrolment/enrolment.component';
import { Enrolment } from '../../../enrolment/models/enrolment.model';
import { ChildEnrolmentService } from '../../../enrolment/services/enrolment.service';
import * as uuid from 'uuid';
import { ParentChildService } from 'app/main/modules/parent-child/service/parent-child.service';
import { takeUntil } from 'rxjs/operators';
import { ChildrenService } from '../../../services/children.service';

@Component({
  selector: 'app-approve-cwa-admin-dialog',
  templateUrl: './approve-cwa-admin-dialog.component.html',
  styleUrls: ['./approve-cwa-admin-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ApproveCwaAdminDialogComponent implements OnInit {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;
    enrolment: Enrolment;
    fees: Fee[];
    booking: Booking[];
    client: AuthClient;

    acceptcwa: boolean;
    formTitle: string;
    childEnrolmentForm: FormGroup;
    buttonLoader: boolean;
    buttonLoaderSubmit: boolean;
    canEndDateOpen: boolean;
    current: number;
    weekDays: any;
    hideWeekEnd: boolean;

    sessionViewLoading: boolean;
    sessionRoutines: SessionRoutine[];

    setCRNModal: NzModalRef;
    setSessionModal: NzModalRef;
    confirmModal: NzModalRef;

    viewLateSubmissionReason: boolean;
    hasBookingUpdate: any;
    loadingView: boolean;
    entitlement: any;
    showAgreement: boolean;

    tabViewItem: number | null;
    constructor(
        public matDialogRef: MatDialogRef<ApproveCwaAdminDialogComponent>,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _authService: AuthService,
        private _bookingService: ChildBookingService,
        private _childrenService: ChildrenService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) 
    { 
        // set default values
        this._logger.debug('[child data]', _data);
        this.client = this._authService.getClient();
        this.buttonLoader = false;
        this.buttonLoaderSubmit = false;
        this.canEndDateOpen = false;
        this.current = 0;
        this.weekDays = this._commonService.getWeekDays({
            hideWeekEnd: false,
            weekStartsAt: 1
        });
        this.hideWeekEnd = this._bookingService.calenderSettings.hideWeekEnd;
        this.formTitle = 'New Enrolment';

        this.sessionViewLoading = false;
        this.sessionRoutines = [];

        this.viewLateSubmissionReason = false;
        this.hasBookingUpdate = false;

        this.tabViewItem = null;

        this._unsubscribeAll = new Subject();
        this.enrolment = _data.enrolment;
        this.child = _data.child
        this.acceptcwa =true;
        this.showAgreement = this.enrolment.parentApprovedStatus === '2' ? false : true;
    }

  ngOnInit() {

    if (this.enrolment.sessionType === 'R' || this.enrolment.sessionType === 'B' && !_.isNull(this.enrolment.weekCycle))
        {
            this.buildSessionView();
        }

  }

  buildSessionView(): void
  {
      // reset
      this.sessionRoutines = [];

      const startDate = DateTimeHelper.now().startOf('isoWeek');
      const endDate = startDate.clone().add(+this.enrolment.weekCycle === 1 ? 6 : 13, 'd');
      const dateRange = DateTimeHelper.getDateRange(startDate, endDate);

      // generate week map
      for (const [index, item] of dateRange.entries())
      {
          const sessions: SessionRoutineItem[] = !_.isNull(this.enrolment) ? this.enrolment.routines.routine.filter((i: any) => +i.sessionDay === item.day()) : [];

          if (this.hideWeekEnd && (item.day() === 6 || item.day() === 0))
          {
              continue;
          }

          this.sessionRoutines.push({
              id: uuid.v4(),
              date: item.toDate(),
              day: _.toLower(item.format('ddd')),
              cycleWeek: dateRange.length > 6 && index > 6 ? 2 : 1,
              sessions: sessions
          });
      }

    //   setTimeout(() => this.updateScroll(), 100);
  }

  trackByFn(index: number, item: any): number
  {
      return index;
  }

  accept(e: MouseEvent, item: Enrolment ): void
  {
      e.preventDefault();

      if (!item)
      {
          return;
      }


      this._logger.debug('[branch object]', item);

      this.buttonLoader = true;
      const dataObj = {
          id: item.id,
          child: this.child.id
      };

      this._childrenService
          .updateParentStatus(dataObj)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(
              res =>
              {
                  this.buttonLoader = false;

                  setTimeout(() => this.matDialogRef.close(res), 250);
              },
              error =>
              {
                  this.buttonLoader = false;

                  throw error;
              },
              () =>
              {
                  this._logger.debug('😀 all good. 🍺');
              }
          );
  }

}

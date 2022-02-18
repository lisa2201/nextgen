import { Component, OnInit, ChangeDetectorRef, Inject, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { CommonService } from 'app/shared/service/common.service';
import { BranchService } from '../../branch/services/branch.service';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { Enrolment } from '../../child/enrolment/models/enrolment.model';
import { AuthClient } from 'app/shared/model/authClient';
import { AuthService } from 'app/shared/service/auth.service';
import { SessionRoutine, SessionRoutineItem } from '../../child/enrolment/enrolment.component';
import * as uuid from 'uuid';
import * as moment from 'moment';
import * as _ from 'lodash';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Child } from '../../child/child.model';
import { ParentChildService } from '../service/parent-child.service';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { ChildBookingService } from '../../child/booking/services/booking.service';

@Component({
    selector: 'view-cwa-content',
    templateUrl: './view-cwa-content.component.html',
    styleUrls: ['./view-cwa-content.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        slideMotion,
        fadeMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ViewCwaContentComponent implements OnInit {

    enrolment: Enrolment;
    client: AuthClient;
    sessionRoutines: SessionRoutine[];
    hideWeekEnd: boolean;
    child: Child;
    buttonLoader: boolean;
    private _unsubscribeAll: Subject<any>;
    showAgreement: boolean;
    acceptcwa: boolean;
    weekDays: any;

    constructor(
        public matDialogRef: MatDialogRef<ViewCwaContentComponent>,
        private _logger: NGXLogger,
        private _notification: NotificationService,
        private _commonService: CommonService,
        private _cd: ChangeDetectorRef,
        private _authService: AuthService,
        private _ParentchildService: ParentChildService,
        @Inject(MAT_DIALOG_DATA) private _data: any
    ) 
    {
        
        this._logger.debug('[enroment data]', _data);
        
        this.client = this._authService.getClient();
        this._logger.debug('[auth user]',this.client);
        this.weekDays = this._commonService.getWeekDays({
            hideWeekEnd: false,
            weekStartsAt: 1
        });
        this.hideWeekEnd = false;
        this.enrolment = _data.entrolment;
        this.child = _data.child;
        this.showAgreement = this.enrolment.parentApprovedStatus === '2' ? false : true;
        this._unsubscribeAll = new Subject();
        this._logger.debug('[this.showAgreement]', this.showAgreement);
        this.acceptcwa = true;
    }

    ngOnInit(): void {
        
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

    trackByFn(idx: number, item: any): number {
        return idx;
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
            id: item.id
        };

        this._ParentchildService
            .acceptCWA(dataObj)
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

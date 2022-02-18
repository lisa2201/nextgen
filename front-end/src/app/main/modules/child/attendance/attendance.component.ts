import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntil, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { slideMotion, fadeMotion } from 'ng-zorro-antd';

import { ChildrenService } from '../services/children.service';
import { ChildAttendanceService } from './services/attendance.service';

import { Child } from '../child.model';

import { browserRefresh } from 'app/app.component';

import { AttendanceWeekViewComponent } from './week-view/week-view.component';

export interface AttendanceSummary
{
    booked: number;
    attended: number;    
    notCompleted: number;    
    noAttendance: number;
    absence: number;
    holiday: number;
}

@Component({
    selector: 'child-attendance',
    templateUrl: './attendance.component.html',
    styleUrls: ['./attendance.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        slideMotion,
        fadeMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ChildAttendanceComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    child: Child;

    viewHelpPanel: boolean;
    showBookingInfo: boolean;
    attendanceSummary: AttendanceSummary;

    @ViewChild(AttendanceWeekViewComponent)
    calendarComponent: AttendanceWeekViewComponent;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {Router} _router
     * @param {MatDialog} _matDialog
     * @param {ChildrenService} _childrenServices
     * @param {ChildAttendanceService} _attendanceService
     */
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _matDialog: MatDialog,
        private _childrenServices: ChildrenService,
        private _attendanceService: ChildAttendanceService
    )
    {
        // set default values
        this.viewHelpPanel = true;
        this.showBookingInfo = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._logger.debug('child attendance !!!');

        // Subscribe to child attendance changes
        this._attendanceService
            .onChildChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((child: any) => 
            {
                this._logger.debug('[child booking]', child);

                this.child = child;

                if (browserRefresh)
                {
                    this._childrenServices.setDefaultCurrentChild(this.child);
                }
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Close all dialogs
        this._matDialog.closeAll();

        // reset service
        this._attendanceService.unsubscribeOptions();

        // reset child service
        if (this._router.routerState.snapshot.url.indexOf('/manage-children') < 0)
        {
            this._childrenServices.unsubscribeOptions();
        }

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    trackByFn(index: number, item: any): number
    {
        return index;
    }

    /**
     * go back
     *
     * @param {MouseEvent} e
     */
    onBack(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([_.head(_.filter(this._router.url.split('/'), _.size))]);
    }

    /**
     * check calendar loader
     *
     * @readonly
     * @type {boolean}
     */
    get calendarLoading(): boolean
    {
        return (typeof this.calendarComponent !== 'undefined') ? this.calendarComponent.weekCalendarLoading : false;
    }

    /**
     * display help information
     *
     * @param {MouseEvent} e
     */
    showHelpPanel(e: MouseEvent): void
    {
        e.preventDefault();

        this.viewHelpPanel = !this.viewHelpPanel;
    }

    /**
     * display booking information
     *
     * @param {any} e
     */
    showBookingDetails(e: any): void
    {
        e.preventDefault();

        e.srcElement.blur();

        this.showBookingInfo = !this.showBookingInfo;

        this._attendanceService.onShowBookingDetailView.next(this.showBookingInfo);
    }
}

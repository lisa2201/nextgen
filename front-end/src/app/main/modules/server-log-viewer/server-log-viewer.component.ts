import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntil, startWith, distinctUntilChanged, skip } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';
import * as differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { ServerLogViewerService } from './services/server-log-viewer.service';

import { DateTimeHelper } from 'app/utils/date-time.helper';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';

@Component({
    selector: 'server-log-viewer',
    templateUrl: './server-log-viewer.component.html',
    styleUrls: ['./server-log-viewer.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ServerLogViewerComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    calendarWeek: FormControl;
    weekCalendarLoading: boolean;

    @ViewChild('weekPicker')
    weekCalenderInput: ElementRef;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _logService: ServerLogViewerService
    )
    {
        // set default values
        this.calendarWeek = new FormControl(null);
        this.weekCalendarLoading = false;

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
        this._logger.debug('server log viewer !!!');

        // Subscribe to view loader changes
        this._logService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => 
            {
                this.weekCalendarLoading = value;

                setTimeout(() => this.updateScroll(), 100);
            });

        // Subscribe to form value changes
        this.calendarWeek
            .valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                startWith(this.calendarWeek.value),
                distinctUntilChanged(),
                skip(1)
            )
            .subscribe(value =>
            {
                if (_.isNull(value))
                {
                    return;    
                }

                this._logService.onCalenderDateChanged.next(value);
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this._logService.unsubscribeOptions();
        
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * disable future dates
     */
    disabledDate = (current: Date): boolean =>
    {
        return differenceInCalendarDays.default(current, new Date()) > 0;
    }


    /**
     * update page scroll
     */
    updateScroll(): void
    {
        if ( this.directiveScroll )
        {
            this.directiveScroll.update(true);
        }
    }

    /**
     * show month view selector
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    toggleCalendar(e: MouseEvent): void
    {
        e.preventDefault();

        if (this.weekCalendarLoading)
        {
            return;
        }

        (<HTMLElement> (<HTMLElement> this.weekCalenderInput.nativeElement).querySelector('.ant-picker-input')).click();
    }

    /**
     * get calendar date
     *
     * @returns {string}
     */
    getCalendarDate(): string
    {
        return !_.isNull(this.calendarWeek.value) ? DateTimeHelper.parseMoment(this.calendarWeek.value).format('MMMM Do YYYY') : 'Pick a date';
    }
}

import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { ServerLogViewerService } from '../services/server-log-viewer.service';

import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'server-log-viewer-list-view',
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ServerLogViewerListViewComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    logs: any;
    tableLoading: boolean;

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
        this.logs = [];
        this.tableLoading = false;

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
        this._logger.debug('server log viewer - list view !!!');

        // Subscribe to date changes
        this._logService
            .onCalenderDateChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: any) => this.getServerLogs(value));

        // Subscribe to view loader changes
        this._logService
            .onTableLoaderChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.tableLoading = value);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * get logs
     *
     * @param {*} date
     */
    getServerLogs(date: any): void
    {
        this._logService
            .getLogs(DateTimeHelper.parseMoment(date).format('YYYY-MM-DD'))
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                res => this.logs = !_.isNull(res) ? _.sortBy(res.logs).reverse() : [],
                error =>
                {
                    throw error;
                },
                () =>
                {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }
}

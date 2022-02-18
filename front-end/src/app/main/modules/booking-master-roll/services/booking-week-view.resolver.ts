import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NotificationService } from 'app/shared/service/notification.service';
import { BookingMasterRollCoreService } from './booking-core.service';

import { BookingSessionType } from 'app/shared/enum/booking-session-type.enum';
import { browserRefresh } from 'app/app.component';
import { NotifyType } from 'app/shared/enum/notify-type.enum';

@Injectable()
export class MasterRollWeekViewResolver
{
    private _unsubscribeAll: Subject<any>;

    constructor(
        private _router: Router,
        private _notificationService: NotificationService,
        private _coreService: BookingMasterRollCoreService
    )
    {
        this._unsubscribeAll = new Subject();
    }

    /**
     * Resolver
     *
     * @param {ActivatedRouteSnapshot} route
     * @param {RouterStateSnapshot} state
     * @returns {Observable<any> | Promise<any> | any}
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any
    {
        return new Promise((resolve, reject) =>
        {
            this._coreService.setViewHolder(route.routeConfig.component.name);

            this._coreService.resetVariables();

            forkJoin([
                this._coreService.getDependency(BookingSessionType.BOTH).toPromise(),
            ])
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(
                    ([dependencies]) =>
                    {
                        this._coreService.setEvents(dependencies);
    
                        resolve(null);
                    },
                    errorResponse =>
                    {
                        if (browserRefresh && state.url !== '')
                        {
                            if (errorResponse && errorResponse.error)
                            {
                                this._notificationService.displaySnackBar(errorResponse.error.message, NotifyType.ERROR);
                            }

                            this._router.navigate([_.head(_.filter(state.url.split('/'), _.size))]);
                        }

                        reject(errorResponse);
                    }
                );
        });
    }
}
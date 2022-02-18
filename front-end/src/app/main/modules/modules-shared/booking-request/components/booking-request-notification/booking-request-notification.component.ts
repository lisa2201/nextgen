import { Component, OnInit, ViewEncapsulation, OnDestroy, AfterViewInit } from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';
import { MatDialog } from '@angular/material/dialog';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { BookingRequestService } from '../../services/booking-request.service';
import { AuthService } from 'app/shared/service/auth.service';

import { BookingRequest } from 'app/main/modules/child/booking-request/booking-request.model';

import { BookingRequestViewComponent } from '../../dialogs/booking-request.component';

@Component({
    selector: 'booking-request-notification',
    templateUrl: './booking-request-notification.component.html',
    styleUrls: ['./booking-request-notification.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class BookingRequestNotificationComponent implements OnInit, AfterViewInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    bookingRequests: BookingRequest[];
    isAdmin: boolean;
    
    dialogRef: any;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {BookingRequestService} _requestService
     */
    constructor(
        private _logger: NGXLogger,
        private _matDialog: MatDialog,
        private _requestService: BookingRequestService,
        private _focusMonitor: FocusMonitor,
        private _authService: AuthService
    )
    {
        // set default values
        this.bookingRequests = [];
        this.isAdmin = this._authService.hasAdminRights();

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
        this._logger.debug('booking request notification !!!');

        // Subscribe to booking request changes
        this._requestService
            .onBookingRequestsChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) => 
            {
                this._logger.debug('[booking request]', response);

                if (!response.isFiltered)
                {
                    this.bookingRequests = response.list;
                }
            });
    }

    /**
     * Respond after initializes the component's views
     */
    ngAfterViewInit(): void 
    {
        setTimeout(() => this._requestService.getBookingRequest(false, true), 200);
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
     * open booking request view
     *
     * @param {*} e
     */
    openBookingRequestView(e: any): void
    {
        e.preventDefault();

        setTimeout(() => 
        {
            this.dialogRef = this._matDialog
                .open(BookingRequestViewComponent,
                {
                    panelClass: 'booking-request-view',
                    closeOnNavigation: true,
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        response: this.bookingRequests
                    }
                });
                
            this.dialogRef
                .afterClosed()
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(response =>
                {   
                    this._focusMonitor.stopMonitoring(e.srcElement);
                    
                    // this._notification.clearSnackBar();

                    // setTimeout(() => this._notification.displaySnackBar(message, NotifyType.SUCCESS), 200);
                });
        });
    }
}

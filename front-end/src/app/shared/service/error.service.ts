import { Injectable } from '@angular/core';
import { Router, Event, NavigationError } from '@angular/router';
import { Observable, of } from 'rxjs';
import { PathLocationStrategy, LocationStrategy } from '@angular/common';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';

import { NGXLogger } from 'ngx-logger';
import { DeviceDetectorService } from 'ngx-device-detector';

import * as StackTraceParser from 'error-stack-parser';

import { AuthService } from '../service/auth.service';

export interface ApiErrorResponse {
    code: number;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class ErrorService {

    /**
     * Constructor
     *
	 * @param {NGXLogger} _logger
	 * @param {Router} _router
	 * @param {HttpClient} _httpClient
	 * @param {AuthService} _authService
	 * @param {DeviceDetectorService} _deviceService
     */
    constructor(
        private _logger: NGXLogger,
        private _router: Router,
        private _httpClient: HttpClient,
        private _authService: AuthService,
        private _deviceService: DeviceDetectorService
    )
    { 
        // Subscribe to the NavigationError
        /*this._router
            .events
            .subscribe((event: Event) =>
            {
                if (event instanceof NavigationError)
                {
                    this.logError(event.error)
                        .subscribe((errorWithContext: any) =>
                        {
                            // this._router.navigate(['/error'], { queryParams: errorWithContext })
                        });
                }
            });*/
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    logError(error: any): Observable<any>
    {
        console.error(error);

        const errorToSend = this.addErrorContextInfo(error);

        return of(true);
    }

    addErrorContextInfo(error: any): object
    {
        const domain = '';
        const device = this._deviceService.getDeviceInfo();
        const user = this._authService.currentUserValue;
        const name = error.name || null;
        const time = new Date().getTime();
        const location = LocationStrategy;
        const url = location instanceof PathLocationStrategy ? location.path() : '';
        const status = error.status || null;
        const message = error.message || error.toString();
        const stack = error instanceof HttpErrorResponse ? ((this.getErrors(error) != null && typeof this.getErrors(error).message !== 'undefined') ? this.getErrors(error).message : null) : StackTraceParser.parse(error);

        return { domain, device, user, name, time, url, status, message, stack };
    }

    getClientMessage(error: Error): string 
    {
        return error.message ? error.message : error.toString();
    }

    getServerMessage(error: HttpErrorResponse): string
    {
        if((this.getErrors(error) != null && typeof this.getErrors(error).message !== 'undefined'))
        {
            return `${this.getErrors(error).message}`;
        }
        else
        {
            return error.status === 0 ? 'Service not available! please contact the support for further details' : `${error.status} - ${error.message}`;
        }
    }

    private getErrors(error: any): any
    {
        try
        {
            if (error && error.error)
            {
                return <ApiErrorResponse> error.error;   
            }
        }
        catch (err)
        {
            return null;
        }
    }
    
}

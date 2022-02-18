import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { NGXLogger } from 'ngx-logger';

import { ErrorService } from '../service/error.service';
import { NotificationService } from '../service/notification.service';

import { NotifyType } from '../enum/notify-type.enum';

import { environment } from 'environments/environment';


@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

    /**
     * Constructor
     *
     * @param {Injector} _injector
     */
    constructor(
        private _injector: Injector
    )
    {
        
    }

    /**
     * 
     * @param {Error | HttpErrorResponse} error 
     */
    handleError(error: Error | HttpErrorResponse | any): void
    {
        const _logger = this._injector.get(NGXLogger);
        const _errorService = this._injector.get(ErrorService);
        const _route = this._injector.get(Router);
        const _notificationService = this._injector.get(NotificationService);

        if (!(error instanceof HttpErrorResponse) && typeof error.rejection !== 'undefined') { error = error.rejection; }

        _logger.debug('[handleError]', error);

        // No Internet connection
        /*if (!navigator.onLine)
        {
            _notificationService.displaySnackBar('No Internet Connection', NotifyType.ERROR);
            
            return;
        }*/

        // check for chunk failure
        const chunkFailedMessage = /Loading chunk [\d]+ failed/;
        
        if (chunkFailedMessage.test(error.message))
        {
            window.location.reload();
        }

        // 
        if (error instanceof HttpErrorResponse)
        {
            // Show notification
            _notificationService.displaySnackBar(_errorService.getServerMessage(error), NotifyType.ERROR);
            
            // Http Error - Send the error to the server
            _errorService.logError(error).subscribe();
        }
        else
        {
            if (!environment.production)
            {
                // Show notification
                _notificationService.displaySnackBar(_errorService.getClientMessage(error), NotifyType.ERROR);
            }

            // Client Error Happened - Send the error to the server and then
            _errorService
                .logError(error)
                .subscribe(errorWithContextInfo =>
                {
                    // router.navigate(['/error'], { queryParams: errorWithContextInfo });
                });
        }
    }
 
}

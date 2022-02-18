import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { first, map, startWith, shareReplay } from 'rxjs/operators';
import { interval, of } from 'rxjs';

import { NGXLogger } from 'ngx-logger';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';

import { PauseableObservable, pauseable } from 'app/utils/rxjs-pauseable.helper';
import { CommonHelper } from 'app/utils/common.helper';
import { AppConst } from '../AppConst';
import { fromWorker } from 'observable-webworker';
import { ConnectionService } from './connection.service';

@Injectable({
    providedIn: 'root'
})
export class VersionCheckService 
{
    private currentHash: string;
    private checkInterval: any;

    confirmModal: NzModalRef;

    internetStatus: boolean;

    /**
     * Constructor
     * 
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     * @param {NzModalService} _modalService
     */
    constructor(
        private _httpClient: HttpClient,
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _connectionService: ConnectionService,
    ) 
    {
        // this will be replaced by actual hash post-build.js
        this.currentHash = '{{POST_BUILD_ENTERS_HASH_HERE}}';
        this.checkInterval = null;

        this._connectionService
            .monitor()
            .subscribe(currentState => 
            {
                this.internetStatus = currentState.hasNetworkConnection && currentState.hasInternetAccess;
                
                if (this.internetStatus)
                {
                    if (this.checkInterval) this.checkInterval.resume();
                }
            });
    }

    /**
     * Checks in every set frequency the version of frontend application
     * 
     * @param url
     * @param {number} frequency - in milliseconds, defaults to 15 minutes
     */
    initVersionCheck(url: string, frequency: number = 1000 * 60 * 15): void 
    {
        this.checkInterval = interval(frequency)
            .pipe(
                map(() => this.checkVersion(url)),
                startWith(0),
                pauseable()
            ) as PauseableObservable<void>;

        this.checkInterval.subscribe();
    }

    /**
     * Will do the call and check if the hash has changed or not
     * 
     * @param url
     */
    checkVersion(url: string): void 
    {
        this._logger.debug('[version check running...]');

        if (CommonHelper.webWorkerEnabled())
        {
            const input$ = of({
                url: url + '?t=' + new Date().getTime()
            });

            fromWorker<any, any>(() => new Worker('app/web-workers/version-checker.worker', { type: 'module' }), input$)
                .subscribe(
                    response => this.verifyVersion(response), 
                    error => 
                    {
                        console.error(error, 'Could not get version');
    
                        if (this.checkInterval)
                        {
                            this.checkInterval.pause();
                            
                            if (!this.internetStatus) this.checkInterval.unsubscribe();
                        }
                    });
        }
        else
        {
            this._httpClient
                .get(url + '?t=' + new Date().getTime())
                .pipe(
                    shareReplay(),
                    first()
                )
                .subscribe(
                    (response: any) => this.verifyVersion(response),
                    (err) => 
                    {
                        console.error(err, 'Could not get version');
    
                        if (this.checkInterval)
                        {
                            this.checkInterval.pause();
                            
                            if (!this.internetStatus) this.checkInterval.unsubscribe();
                        }
                    }
                );
        }
    }

    /**
     * Checks if hash has changed.
     * This file has the JS hash, if it is a different one than in the version.json
     * we are dealing with version change
     * 
     * @param currentHash
     * @param newHash
     * @returns {boolean}
     */
    hasHashChanged(currentHash: string, newHash: string): boolean
    {
        if (!currentHash || currentHash === '{{POST_BUILD_ENTERS_HASH_HERE}}') 
        {
            return false;
        }

        return currentHash !== newHash;
    }

    /**
     * fire checker modal
     */
    verifyVersion(response: any): void
    {
        const hash = response.hash;
        const hashChanged = this.hasHashChanged(this.currentHash, hash);

        if (hashChanged) 
        {
            this.checkInterval.pause();
    
            this.confirmModal = this._modalService
                .confirm(
                    {
                        nzTitle: AppConst.dialogContent.APP_UPDATE.TITLE,
                        nzContent: AppConst.dialogContent.APP_UPDATE.BODY,
                        nzWrapClassName: 'version-ck-modal',
                        nzIconType: 'exclamation-circle',
                        nzCloseOnNavigation: false,
                        nzClosable: false,
                        nzKeyboard: false,
                        nzOkText: 'Reload',
                        nzOkType: 'primary',
                        nzCancelText: 'Later',
                        nzOnOk: () => 
                        {
                            setTimeout(() => 
                            {
                                this.checkInterval.complete();

                                CommonHelper.forceReload();
                            }, 100);
                        },
                        nzOnCancel: () => this.checkInterval.complete()
                    }
                );
        }

        // store the new hash so we wouldn't trigger versionChange again
        // only necessary in case you did not force refresh
        this.currentHash = hash;
    }
}
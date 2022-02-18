import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntil, finalize, delay } from 'rxjs/operators';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';

import { NotificationService } from 'app/shared/service/notification.service';
import { AuthService } from 'app/shared/service/auth.service';
import { DashboardService } from './services/dashboard.service';

import { AuthUser } from 'app/shared/model/authUser';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { AuthClient } from 'app/shared/model/authClient';
import { Branch } from '../branch/branch.model';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations
})
export class DashboardComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    user: AuthUser;
    client: AuthClient;
    
    branches: any[];
    selectedBranch: string;
    isSiteManager: boolean;
   
    hideWidgets: boolean;
    buttonLoader: boolean;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {AuthService} _authService
     * @param {UploadService} _uploadService
     * @param {DashboardService} _dashboardService
     * @param {NotificationService} _notificationService
     * @param {*} _document
     * @memberof DashboardComponent
     */
    constructor(
        private _logger: NGXLogger,
        private _authService: AuthService,
        private _dashboardService: DashboardService,
        private _notificationService: NotificationService,
        @Inject(DOCUMENT) private _document: any
    ) {
        // Set defaults
        this.client = this._authService.getClient();
        this.hideWidgets = this._authService.isAdmin();
        this.isSiteManager = false;
        this.selectedBranch = '';
        this.buttonLoader = false;
        
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
        this._logger.debug('dashboard !!!');

        this._document.body.classList.add('page-content-reset');

        // Subscribe to the user changes
        this._authService
            .currentUser
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: any) => 
            {
                this._logger.debug('[user dashboard]', user);
                
                if(user)
                {
                    this.user = user;                
                }
            });

        if(this._authService.isOwnerPath())
        {
            this.isSiteManager = true;

            // Subscribe to branch changes
            this._dashboardService
                .onDashboardBranchLoaded
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((branches: Branch[]) =>
                {
                    this._logger.debug('[branches]', branches);

                    this.branches = branches;

                    this.selectBranch(_.head(this.branches).id)
                });
        }
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void 
    {
        this._document.body.classList.remove('page-content-reset');
        
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * login to kinderconnect application
     *
     * @param {MouseEvent} e
     */
    processKinderConnect(e: MouseEvent): void
    {
        e.preventDefault();

        if(this.client && this.client.hasKinderConnect)
        {
            this.buttonLoader = true;

            this._notificationService.displaySnackBar('Connecting to kinderconnect...', NotifyType.LOADING);

            this._authService
                .loginToKinderConnect()
                .pipe(
                    delay(500),
                    takeUntil(this._unsubscribeAll),
                    finalize(() => 
                    {
                        this.buttonLoader = false;

                        this._notificationService.clearSnackBar();
                    })
                )
                .subscribe(
                    response => 
                    {
                        setTimeout(() => this._notificationService.displaySnackBar('Connected successfully!', NotifyType.INFO), 150);

                        window.open(response, '_blank');
                    },
                    error => { throw error; },
                    () => this._logger.debug('😀 logout success. 🍺')
                );
        }
    }

    /**
     * branch change
     *
     * @returns {void}
     */
    selectBranch(id: string): void
    {
        this.selectedBranch = id;

        this._dashboardService.onBranchChange.next(this.selectedBranch);
    }

    goToLink(url: string): void
    {
        window.open(url, '_blank');
    }
}

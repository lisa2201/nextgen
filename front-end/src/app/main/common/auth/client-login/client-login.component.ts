import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { DOCUMENT } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { FuseConfigService } from '@fuse/services/config.service';

import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { AuthClient } from 'app/shared/model/authClient';
import { environment } from 'environments/environment';
import { UrlHelper } from 'app/utils/url.helper';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'client-login',
    templateUrl: './client-login.component.html',
    styleUrls: ['./client-login.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fadeMotion,
        slideMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ClientLoginComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    clientObj: AuthClient;
    isLoading: boolean;
    autoLoginView: boolean;
    autoLoginStatus: string;
    queryParams: any;
    copyRightYear: number;
    loginForm: FormGroup;
    
    /**
     * Constructor
     *
     * @param {DOCUMENT} _document
     * @param {FuseConfigService} _fuseConfigService
     * @param {FormBuilder} _formBuilder
     * @param {AuthService} _authenticationService
     * @param {NotificationService} _notificationService
     * @param {NGXLogger} _logger
     * @param {Router} _router
     */
    constructor(
        @Inject(DOCUMENT) private _document: any,
        private _fuseConfigService: FuseConfigService,
        private _formBuilder: FormBuilder,
        private _authenticationService: AuthService,
        private _notificationService: NotificationService,
        private _logger: NGXLogger,
        private _router: Router
    ) 
    { 
        // Configure the layout
        this._fuseConfigService.config = {
            layout: {
                style    : 'vertical-layout-2',
                navbar   : {
                    hidden: true
                },
                toolbar  : {
                    hidden: true
                },
                footer   : {
                    hidden: true
                },
                sidepanel: {
                    hidden: true
                }
            }
        };

        // Set defaults
        this.copyRightYear = DateTimeHelper.now().year();
        this.isLoading = false;
        this.queryParams = UrlHelper.getQueryParameters();
        this.autoLoginView = Object.keys(this.queryParams).filter(i => !i).length < 1;
        this.autoLoginStatus = '0';

        // Get client information
        this.clientObj = this._authenticationService.getClient();

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
        this._document.body.classList.add('page-content-reset');

        this.loginForm = this._formBuilder.group({
            email   : [ environment.production ? '' : 'celmucakke@enayu.com', [Validators.required, Validators.email]],
            password: [ environment.production ? '' : 'Kinderm8@', Validators.required]
        });

        this.autoLogin();
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
     * convenience getter for easy access to form fields
     *
     * @readonly
     * @type {*}
     */
    get formVal(): any
    { 
        return this.loginForm.controls; 
    }

    onSubmit(): Observable<any>
    {
        if (this.loginForm.invalid || this.isLoading) 
        {
            return;
        }

        this.isLoading = true;

        this._notificationService.clearSnackBar();

        this._authenticationService
            .login(this.formVal.email.value, this.formVal.password.value)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                data => this.isLoading = !data,
                error =>
                {
                    this.isLoading = false;
                    throw error;
                },
                () => this._logger.debug('😀 all good. 🍺')
            );

    }

    autoLogin(): void
    {
        if(this.autoLoginView)
        {
            setTimeout(() => 
            {
                this._authenticationService
                    .autoLogin(this.queryParams.token)
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe(
                        () =>  this.autoLoginStatus = '1',
                        error => this.autoLoginStatus = '2'
                    );
            }, 500);
        }
    }

    backToLoginPage(e: MouseEvent): void
    {
        e.preventDefault();

        this.autoLoginView = false;
    }

    goForgotPassword(e: MouseEvent): void
    {
        e.preventDefault();
        
        this._router.navigate(['/forgot-password'], { state: { skipGuard: '0' }});
    }

}

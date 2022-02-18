import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { finalize } from 'rxjs/internal/operators/finalize';
import { DOCUMENT } from '@angular/common';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fadeMotion, slideMotion } from 'ng-zorro-antd';

import { FuseConfigService } from '@fuse/services/config.service';
import { AuthService } from 'app/shared/service/auth.service';

import { AuthClient } from 'app/shared/model/authClient';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeMotion,
        slideMotion,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    clientObj: AuthClient;
    isLoading: boolean;
    copyRightYear: number;
    forgotPasswordForm: FormGroup;
    forgotMessage: string;
    loginPath: string;

    /**
     * Constructor
     * 
     * @param {*} _document
     * @param {NGXLogger} _logger
     * @param {FuseConfigService} _fuseConfigService
     * @param {FormBuilder} _formBuilder
     * @param {AuthService} _authenticationService
     * @param {Router} _router
     */
    constructor(
        @Inject(DOCUMENT) private _document: any,
        private _logger: NGXLogger,
        private _fuseConfigService: FuseConfigService,
        private _formBuilder: FormBuilder,
        private _authenticationService: AuthService,
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

        // set default values
        this.copyRightYear = DateTimeHelper.now().year();
        this.isLoading = false;
        this.forgotMessage = null;
        this.loginPath = this._authenticationService.isOwnerPath() ? '/sm-login' : '/login';

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
        this._logger.debug('forgot password !!!');

        this._document.body.classList.add('page-content-reset');

        this.forgotPasswordForm = this._formBuilder.group({
            email: ['', [Validators.required, Validators.email]]
        });
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
    get fc(): any
    { 
        return this.forgotPasswordForm.controls; 
    }

    onSubmit(): Observable<any>
    {
        if (this.forgotPasswordForm.invalid || this.isLoading) 
        {
            return;
        }

        this.isLoading = true;

        this.forgotMessage = null;

        this._authenticationService
            .forgotPassword(this.fc.email.value)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.isLoading = false)
            )
            .subscribe(
                message => 
                {
                    this.forgotMessage = message;

                    setTimeout(() => this.resetForm(), 50);
                },
                error =>
                {
                    throw error;
                },
                () => this._logger.debug('😀 all good. 🍺')
            );

    }

    resetForm(): void
    {
        this.forgotPasswordForm.reset();

        for (const key in this.fc)
        {
            this.fc[key].markAsPristine();
            this.fc[key].updateValueAndValidity();
        }
    }

    goToLogin(e: MouseEvent): void
    {
        e.preventDefault();

        this._router.navigate([this.loginPath], { state: { skipGuard: '0' }});
    }
}

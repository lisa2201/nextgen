import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { DOCUMENT } from '@angular/common';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { fuseAnimations } from '@fuse/animations';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';

import { FuseConfigService } from '@fuse/services/config.service';
import { CommonService } from 'app/shared/service/common.service';
import { ResetPasswordService } from './reset-password.service';
import { AuthService } from 'app/shared/service/auth.service';

import { User } from 'app/main/modules/user/user.model';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import { confirmPasswordValidator } from 'app/shared/validators/confirm-password';
import { CustomValidators } from 'app/shared/validators/custom-validators';
import { finalize } from 'rxjs/internal/operators/finalize';

@Component({
    selector: 'reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    resetForm: FormGroup;
    user: User;

    isLoading: boolean;
    copyRightYear: number;
    resetPasswordSuccess: boolean;
    linkInvalid: string;
    passwordUpdated: string;
    hint: string;
    loginPath: string;

    /**
     * Constructor
     * 
     * @param {*} _document
     * @param {FuseConfigService} _fuseConfigService
     * @param {NGXLogger} _logger
     * @param {CommonService} _commonService
     * @param {ResetPasswordService} _resetPasswordService
     * @param {AuthService} _authenticationService
     * @param {Router} _router
     */
    constructor(
        @Inject(DOCUMENT) private _document: any,
        private _fuseConfigService: FuseConfigService,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _resetPasswordService: ResetPasswordService,
        private _authenticationService: AuthService,
        private _router: Router
    )
    {
        // Configure the layout
        this._fuseConfigService.config = {
            layout: {
                style: 'vertical-layout-2',
                navbar: {
                    hidden: true
                },
                toolbar: {
                    hidden: true
                },
                footer: {
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
        this.resetPasswordSuccess = false;
        this.linkInvalid = null;
        this.passwordUpdated = null;
        this.hint = null;
        this.loginPath = this._authenticationService.isOwnerPath() ? '/sm-login' : '/login';

        this.resetForm = this.createForm();

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
        this._logger.debug('reset password !!!');

        this._document.body.classList.add('page-content-reset');

        // Subscribe to invitation list changes
        this._resetPasswordService
            .onTokenVerified
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: any) =>
            {
                this._logger.debug('[password reset data]', response);

                if (_.isNull(response.item))
                {
                    this.linkInvalid = response.message;
                }
                else
                {
                    this.user = response.item;

                    this.hint = response.hint;
                }
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
        return this.resetForm.controls;
    }

    /**
     * Create compose form
     *
     * @returns {FormGroup}
     */
    createForm(): FormGroup 
    {
        return new FormGroup({
            password: new FormControl('', [
                Validators.required,
                CustomValidators.patternValidator(/\d/, { hasNumber: true }),
                CustomValidators.patternValidator(/[A-Z]/, { hasCapitalCase: true }),
                CustomValidators.patternValidator(/[a-z]/, { hasSmallCase: true }),
                CustomValidators.patternValidator(/[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { hasSpecialCharacters: true }),
                Validators.minLength(6)
            ]),
            passwordConfirm: new FormControl('', [Validators.required, confirmPasswordValidator])
        });
    }

    /**
     * get password related errors
     */
    getPasswordErrorMessage(): any 
    {
        return this.resetForm.get('password').hasError('required') ? 'You must enter a value' :
            this.resetForm.get('password').hasError('hasNumber') ? 'Must contain at least 1 number' :
            this.resetForm.get('password').hasError('hasCapitalCase') ? 'Must contain at least 1 in Capital Case' :
            this.resetForm.get('password').hasError('hasSmallCase') ? 'Must contain at least 1 Letter in Small Case' :
            this.resetForm.get('password').hasError('hasSpecialCharacters') ? 'Must contain at least 1 Special Character' :
            this.resetForm.get('password').hasError('minlength') ? 'Your password should have at least 6 characters' :
            '';
    }

    /**
     * on submit
     *
     * @param {MouseEvent} e
     * @returns {void}
     */
    onSubmit(e: MouseEvent): void 
    {
        e.preventDefault();

        if (this.resetForm.invalid) 
        {
            return;
        }

        const data = {
            user: this.user.id,
            password: this.fc.password.value,
            password_confirmation: this.fc.passwordConfirm.value
        };

        this._logger.debug('[invitation object]', data);

        this.isLoading = true;

        this._resetPasswordService
            .resetPassword(data)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.isLoading = false)
            )
            .subscribe(
                message =>
                {
                    this.passwordUpdated = message;

                    // update parent scroll
                    this._commonService._updateParentScroll.next();
                },
                error => 
                {
                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

    goToLogin(e: MouseEvent): void
    {
        e.preventDefault();
        
        this._router.navigate([this.loginPath], { state: { skipGuard: '0' }});
    }
}

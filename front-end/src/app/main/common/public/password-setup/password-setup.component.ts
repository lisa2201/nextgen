import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfigService } from '@fuse/services/config.service';
import { User } from 'app/main/modules/user/user.model';
import { AppConst } from 'app/shared/AppConst';
import { CommonService } from 'app/shared/service/common.service';
import { confirmPasswordValidator } from 'app/shared/validators/confirm-password';
import { CustomValidators } from 'app/shared/validators/custom-validators';
import { DateTimeHelper } from 'app/utils/date-time.helper';
import * as _ from 'lodash';
import { ReCaptcha2Component } from 'ngx-captcha';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CommonTermsAndConditionComponent } from '../dialog/common-terms-and-condition/common-terms-and-condition.component';
import { PasswordSetupVerify } from './password-setup.model';
import { PasswordSetupAuthService } from './password-setup.service';

@Component({
  selector: 'auth-password-setup',
  templateUrl: './password-setup.component.html',
  styleUrls: ['./password-setup.component.scss'],
  encapsulation: ViewEncapsulation.None,
    animations: [
        fuseAnimations
    ]
})
export class PasswordSetupComponent implements OnInit {

  // Private
  private _unsubscribeAll: Subject<any>;

  invitationForm: FormGroup;
  passwordSetupInvitation: PasswordSetupVerify;
  user: User;

  isLoading: boolean;
  copyRightYear: number;

  recaptchaSiteKey: string;
  invitationAccepted: boolean;
  invalidAccess: boolean;
  linkExpired: boolean;
  checkEmailValidation: boolean;
  isLoged: boolean;

  termsModel: any;

  @ViewChild('captchaElem') recaptchaComponent: ReCaptcha2Component;

  /**
   * Constructor
   * 
   * @param {*} _document
   * @param {FuseConfigService} _fuseConfigService
   * @param {NGXLogger} _logger
   * @param {CommonService} _commonService
   * @param {MatDialog} _matDialog
   */
    constructor(
        @Inject(DOCUMENT) private _document: any,
        private _fuseConfigService: FuseConfigService,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        public _matDialog: MatDialog,
        private _passwordSetupService: PasswordSetupAuthService,
        private _router: Router,
    ) {
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

        // Set defaults
        this.copyRightYear = DateTimeHelper.now().year();
        this.isLoading = false;

        this.recaptchaSiteKey = AppConst.appKeys.recaptchaKey;
        this.invitationAccepted = false;
        this.invalidAccess = false;
        this.linkExpired = false;

        // Set the private defaults
        this._unsubscribeAll = new Subject();

        this.invitationForm = this.createInvitationForm();

        this.checkEmailValidation = true;
        this.isLoged = false;

    }


    ngOnInit(): void
    {
        this._logger.debug('client invitation !!!');

        this._document.body.classList.add('page-content-reset');

        // Subscribe to invitation list changes
        this._passwordSetupService
            .onInvitationTokenVerified
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: PasswordSetupVerify) =>
            {
                this._logger.debug('[client invitations]', response);
                this.passwordSetupInvitation = response;

                if (_.isNull(response))
                {
                    this.linkExpired = true;
                    this.invalidAccess = true;
                }
                else
                {
                    this.isLoged = this.passwordSetupInvitation.isEmailVarified;

                    if (this.passwordSetupInvitation.isinvitationExpired && !response.isEmailVarified)
                    {
                        this.linkExpired = true;
                    }


                    

                }
            });
    }

    goForgotPassword(e: MouseEvent): void
    {
        e.preventDefault();
        
        this._router.navigate(['/forgot-password'], { state: { skipGuard: '0' }});
    }

    createInvitationForm(): FormGroup {
        return new FormGroup({
            password: new FormControl('', [
                Validators.required,
                CustomValidators.patternValidator(/\d/, { hasNumber: true }),
                CustomValidators.patternValidator(/[A-Z]/, { hasCapitalCase: true }),
                CustomValidators.patternValidator(/[a-z]/, { hasSmallCase: true }),
                CustomValidators.patternValidator(/[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, { hasSpecialCharacters: true }),
                Validators.minLength(6)
            ]),
            passwordConfirm: new FormControl('', [Validators.required, confirmPasswordValidator]),
            terms: new FormControl(false, [Validators.requiredTrue]),
            recaptcha: new FormControl('', [Validators.required])
        });
    }

    /**
     * get password related errors
     */
    getPasswordErrorMessage(): any 
    {
        return this.invitationForm.get('password').hasError('required') ? 'You must enter a value' :
            this.invitationForm.get('password').hasError('hasNumber') ? 'Must contain at least 1 number' :
            this.invitationForm.get('password').hasError('hasCapitalCase') ? 'Must contain at least 1 in Capital Case' :
            this.invitationForm.get('password').hasError('hasSmallCase') ? 'Must contain at least 1 Letter in Small Case' :
            this.invitationForm.get('password').hasError('hasSpecialCharacters') ? 'Must contain at least 1 Special Character' :
            this.invitationForm.get('password').hasError('minlength') ? 'Your password should have at least 6 characters' :
            '';
    }

    get formVal(): any {
        return this.invitationForm.controls;
    }

    openTermsConditions(e: MouseEvent): void {
        e.preventDefault();

        this.termsModel = this._matDialog
        .open(CommonTermsAndConditionComponent,
            {
                panelClass: 'common-terms-dialog',
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false
            });
    }

    onFormSubmit(e: MouseEvent): void {
        e.preventDefault();

        if (this.invitationForm.invalid) {
            return;
        }

        const data = {
            id: this.passwordSetupInvitation.id,
            // email: this.formVal.email.value,
            password: this.formVal.password.value,
            recaptcha: this.formVal.recaptcha.value
        };

        this._logger.debug('[invitation object]', data);

        this.isLoading = true;

        this._passwordSetupService
            .acceptPasswordSetupInvitation(data)
            .pipe(
                takeUntil(this._unsubscribeAll),
                finalize(() => this.isLoading = false)
            )
            .subscribe(
                res =>
                {
                    console.log('response', res);
                    
                    this.invitationAccepted = true;
                    this.isLoged = true;

                    // update parent scroll
                    this._commonService._updateParentScroll.next();

                    setTimeout(() => window.location.href = res, 1000);
                },
                error => 
                {
                    this.recaptchaComponent.resetCaptcha();

                    this.invitationForm.get('recaptcha').patchValue('');

                    throw error;
                },
                () => {
                    this._logger.debug('😀 all good. 🍺');
                }
            );
    }

}

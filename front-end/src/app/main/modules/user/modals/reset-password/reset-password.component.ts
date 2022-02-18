import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

import * as _ from 'lodash';

import { NGXLogger } from 'ngx-logger';

import { NzModalRef } from 'ng-zorro-antd/modal';
import { CustomValidators } from 'app/shared/validators/custom-validators';
import { confirmPasswordValidator } from 'app/shared/validators/confirm-password';

@Component({
    selector: 'user-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class UserResetPasswordComponent implements OnInit, OnDestroy {

    // Private
    private _unsubscribeAll: Subject<any>;

    resetPasswordForm: FormGroup;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     */
    constructor(
        private _logger: NGXLogger,
        private _modal: NzModalRef
    )
    {
        // set default values
        

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
        this._logger.debug('user reset password modal !!!');

        this.resetPasswordForm = this.createForm();
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
     * convenience getter for easy access to form fields
     */
    get fc(): any 
    { 
        return this.resetPasswordForm.controls; 
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
            passwordConfirm: new FormControl('', [Validators.required, confirmPasswordValidator]),
        });
    }

    /**
     * get password related errors
     */
    getPasswordErrorMessage(): any 
    {
        return this.resetPasswordForm.get('password').hasError('required') ? 'You must enter a value' :
            this.resetPasswordForm.get('password').hasError('hasNumber') ? 'Must contain at least 1 number' :
            this.resetPasswordForm.get('password').hasError('hasCapitalCase') ? 'Must contain at least 1 in Capital Case' :
            this.resetPasswordForm.get('password').hasError('hasSmallCase') ? 'Must contain at least 1 Letter in Small Case' :
            this.resetPasswordForm.get('password').hasError('hasSpecialCharacters') ? 'Must contain at least 1 Special Character' :
            this.resetPasswordForm.get('password').hasError('minlength') ? 'Your password should have at least 6 characters' :
            '';
    }

    /**
     * get new password
     *
     * @returns {any}
     */
    getValue(): any
    {
        return {
            password: this.fc.password.value,
            confirm: this.fc.passwordConfirm.value
        };
    }

    destroyModal(): void
    { 
        this._modal.destroy();
    }
}

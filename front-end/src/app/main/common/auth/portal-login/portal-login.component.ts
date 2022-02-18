import { Component, OnInit, ViewEncapsulation, OnDestroy, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { FuseConfigService } from '@fuse/services/config.service';
import { fuseAnimations } from '@fuse/animations';

import { NGXLogger } from 'ngx-logger';

import { AuthService } from 'app/shared/service/auth.service';
import { NotificationService } from 'app/shared/service/notification.service';

import { environment } from 'environments/environment';
import { DateTimeHelper } from 'app/utils/date-time.helper';

@Component({
    selector: 'portal-login',
    templateUrl: './portal-login.component.html',
    styleUrls: ['./portal-login.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations
})
export class PortalLoginComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;

    isLoading: boolean;
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
     */
    constructor(
        @Inject(DOCUMENT) private _document: any,
        private _fuseConfigService: FuseConfigService,
        private _formBuilder: FormBuilder,
        private _authenticationService: AuthService,
        private _notificationService: NotificationService,
        private _logger: NGXLogger
    )
    {
        // Configure the layout
        this._fuseConfigService.config = {
            layout: {
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
            email   : [ environment.production ? '' : 'superadmin@km8.com', [Validators.required, Validators.email]],
            password: [ environment.production ? '' : 'admin', Validators.required]
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
    get formVal(): any
    { 
        return this.loginForm.controls; 
    }

    onSubmit(): Observable<any>
    {
        this.isLoading = true;

        if (this.loginForm.invalid) 
        {
            return;
        }

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

}

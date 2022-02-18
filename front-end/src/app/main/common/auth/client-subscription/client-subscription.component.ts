import { Component, OnInit, ViewEncapsulation, OnDestroy, ViewChild, AfterViewInit, Inject } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';

import { FuseConfigService } from '@fuse/services/config.service';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ReCaptcha2Component } from 'ngx-captcha';
import { NGXLogger } from 'ngx-logger';
import { helpMotion } from 'ng-zorro-antd';
import { NzModalService } from 'ng-zorro-antd/modal';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import * as _ from 'lodash';

import { ClientSubscriptionService } from './services/client-subscription.service';
import { Country, Timezone, CityState } from 'app/shared/model/common.interface';
import { MustMatch } from 'app/shared/validators/matchInputs';
import { TermsDialogComponent } from './terms-dialog/terms-dialog.component';
import { AppConst } from 'app/shared/AppConst';
import { CommonService } from 'app/shared/service/common.service';
import { ErrorService } from 'app/shared/service/error.service';
import { SubscriptionEmailValidationComponent } from './subscription-email-validation/subscription-email-validation.component';

@Component({
    selector: 'client-subscription',
    templateUrl: './client-subscription.component.html',
    styleUrls: ['./client-subscription.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class ClientSubscriptionComponent implements OnInit, OnDestroy, AfterViewInit {

    private _unsubscribeAll: Subject<any>;
    otherOption = 'Other';

    // Form
    subscriptionForm: FormGroup; // Subscription Form
    hidePassword: boolean; // Hide/Show Password
    isSubmitted: boolean;
    currentYear: number;
    recaptchaSiteKey: string;
    subscribedEmail: string;
    registrationMode: boolean;
    stateLoading: boolean;
    addonId: string;
    mediaChannels: string[];
    showHearAbout: boolean;
    subscriptionCycle: string;

    // common
    buttonLoading: boolean;
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive

    // Email verification
    verifyMode: boolean;
    verifyToken: string;
    verifyProcessing: boolean;
    verfiySuccess: boolean;
    verifyFail: boolean;
    showVerifyResend: boolean;
    verifyMessage: string;
    orgId: string;

    @ViewChild('captchaElem') recaptchaComponent: ReCaptcha2Component;

    countriesList: Country[] = []; // Country Select
    timezoneListOriginal: Timezone[] = []; // Timezone Select
    timezoneList: Timezone[] = []; // Timezone Select Filtered
    stateList: CityState[] = []; // City States Select
    paymentFrequencyList: string[] = []; // Payment Frequency Select

    /**
     * 
     * @param _formBuilder 
     * @param _dialogService 
     * @param _fuseConfigService 
     * @param _logger 
     * @param _commonService 
     * @param _clientSubscriptionService 
     * @param _route 
     * @param _errorService 
     */
    constructor(
        private _formBuilder: FormBuilder,
        private _dialogService: MatDialog,
        private _fuseConfigService: FuseConfigService,
        private _logger: NGXLogger,
        private _commonService: CommonService,
        private _clientSubscriptionService: ClientSubscriptionService,
        private _route: ActivatedRoute,
        private _errorService: ErrorService,
        @Inject(DOCUMENT) private _document: any,
        private _modalService: NzModalService
    ) {
        this._setFuseConfig();
        this._unsubscribeAll = new Subject();
        this.hidePassword = true;
        this.isSubmitted = false;
        this.currentYear = new Date().getFullYear();
        this.recaptchaSiteKey = AppConst.appKeys.recaptchaKey;
        this.paymentFrequencyList = AppConst.payment.PAYMENT_FREQUENCY.CLIENT;
        this.buttonLoading = false;
        this.verifyFail = false;
        this.verfiySuccess = false;
        this.showVerifyResend = false;
        this.stateLoading = false;
        this.showHearAbout = false;

        this.mediaChannels = [
            'Facebook',
            'Email/Newsletter',
            'Word of Mouth',
            'Existing Centre',
            'Google',
            'Other Social Media Platforms',
            this.otherOption
        ];

        if (
            this._route.snapshot.queryParamMap.has(AppConst.queryParamKeys.MARKET_PLACE.emailVerifyToken) &&
            !_.isEmpty(this._route.snapshot.queryParamMap.get(AppConst.queryParamKeys.MARKET_PLACE.emailVerifyToken))
        ) {
            this.verifyToken = this._route.snapshot.queryParamMap.get(AppConst.queryParamKeys.MARKET_PLACE.emailVerifyToken);
            this.registrationMode = false;
            this.verifyMode = true;
            this.verifyProcessing = true;
        } else {
            this.addonId = this._route.snapshot.queryParamMap.get(AppConst.queryParamKeys.MARKET_PLACE.productId);
            this.verifyProcessing = false;
            this.verifyMode = false;
            this.registrationMode = true;
            this.subscriptionCycle = this._route.snapshot.queryParamMap.get(AppConst.queryParamKeys.MARKET_PLACE.subscriptionCycle);
        }

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     *  On Init
     */
    ngOnInit(): void {

        this._document.body.classList.add('page-content-reset');

        if (this.registrationMode) {

            this._setScrollDirective();
            this._setInitData();
            this._createForm();
            this._countryChange();
            this._hearAboutChange();
        
        }

    }

    /**
     * After View Init
     */
    ngAfterViewInit(): void {

        if (this.verifyMode) {
            setTimeout(() => {
                this._verifyEmail();
            }, 200);
        }

    }

    /**
     * On Destroy
     */
    ngOnDestroy(): void {

        this._document.body.classList.remove('page-content-reset');

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Set fuse config
     */
    _setFuseConfig(): void {
        this._fuseConfigService.config = {
            layout: {
                style: 'vertical-layout-1',
                width: 'fullwidth',
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
    }

    /**
     * Set scroll directive of vertical 1 layout scroll
     */
    _setScrollDirective(): void {
        this._commonService.verticalLayout1ScrollDirective
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((directive: FusePerfectScrollbarDirective | null) => {
                this.scrollDirective = directive;
            });
    }

    /**
     * Set select data
     */
    _setInitData(): void {
        
        const resolveData = this._route.snapshot.data['resolveData'];

        if (!_.isEmpty(resolveData)) {
            this.countriesList = resolveData[0];
            this.timezoneListOriginal = resolveData[1];
        }

    }

    /**
     * Create form
     */
    _createForm(): void {

        this.subscriptionForm = this._formBuilder.group(
            {
                firstName: ['', Validators.required],
                lastName: ['', Validators.required],
                companyName: ['', Validators.required],
                email: ['', { validators: [Validators.required, Validators.email], updateOn: 'blur'}],
                address1: ['', Validators.required],
                address2: [''],
                phone: ['', Validators.required],
                // paymentFrequency: [null, Validators.required],
                country: [null, Validators.required],
                timezone: [null, Validators.required],
                password: ['', { validators: [Validators.required, Validators.minLength(7)], updateOn: 'blur'}],
                confirmPassword: ['', { validators: [Validators.required], updateOn: 'blur'}],
                hearAbout: [null, Validators.required],
                hearAboutOther: [''],
                abn: ['', Validators.required],
                agreement: [false, Validators.requiredTrue],
                recaptcha: ['', Validators.required],
                postalCode: ['', Validators.required],
                state: ['', Validators.required],
                city: ['', Validators.required]
            },
            {
                validators: MustMatch('password', 'confirmPassword')
            }
        );

        // Async Validator Fix
        setTimeout(() => {
            this.subscriptionForm.get('timezone').disable({ emitEvent: false });
        }, 100);

    }

    /**
     * Country change handler
     */
    _countryChange(): void {

        this.subscriptionForm.get('country').valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((countryData: string) => {

            this._filterTimezone(countryData);

        });

    }

    /**
     * How did you hear about us change handler
     */
    _hearAboutChange(): void { 

        this.subscriptionForm.get('hearAbout').valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((value: string) => {

            const hearAboutOtherInput = this.subscriptionForm.get('hearAboutOther');

            if (value.toLowerCase() === this.otherOption.toLowerCase()) {

                this.showHearAbout = true;
                hearAboutOtherInput.setValidators(Validators.required);
                hearAboutOtherInput.updateValueAndValidity();
                hearAboutOtherInput.reset();

            } else {

                this.showHearAbout = false;
                hearAboutOtherInput.clearValidators();
                hearAboutOtherInput.updateValueAndValidity();
                
            }

        });

    }

    /**
     * Attach timezone for selected country
     * @param {string} code
     */
    _filterTimezone(code: string): void {
        
        const timezoneselect = this.subscriptionForm.get('timezone');

        if (timezoneselect.disabled) {
            timezoneselect.enable({ emitEvent: false });
        }

        timezoneselect.reset();

        this.timezoneList = _.filter(this.timezoneListOriginal, {'countryCode': code});

    }

    /**
     * Verify email
     */
    _verifyEmail(): void {

        this._clientSubscriptionService.verifyEmail({token: this.verifyToken})
        .subscribe(
            (response: {active: boolean, expired: boolean, message: string}) => {
                this._logger.info(response);
                this.verifyProcessing = false;
                this.verifyMessage = response.message;
                
                if (response.active) {
                    this.verfiySuccess = true;
                } else {

                    if (response.expired) {
                        this.showVerifyResend = true;
                    }
                    
                    this.verifyFail = true;
                }
            },
            (error) => {
                this.verifyProcessing = false;
                this.verifyMessage = this._errorService.getServerMessage(error);
                this.verifyFail = true;
                throw error;
            }
        );

    }

    /**
     * Form submit handler
     */
    onSubmit(): void {

        if (!this.subscriptionForm.valid) {
            return;
        }

        const formValues = this.subscriptionForm.value;

        const sendData = {
            firstname: formValues.firstName,
            lastname: formValues.lastName,
            companyname: formValues.companyName,
            email: formValues.email,
            password: formValues.password,
            timezone: formValues.timezone,
            country: formValues.country,
            // paymentfrequency: formValues.paymentFrequency,
            phonenumber: formValues.phone,
            address1: formValues.address1,
            address2: formValues.address2 ? formValues.address2 : null,
            howdidyouhear: formValues.hearAbout === this.otherOption ? formValues.hearAboutOther :  formValues.hearAbout,
            companycode: formValues.country ? (formValues.country === 'AU' ? formValues.abn : null) : null,
            postalCode: formValues.postalCode,
            state: formValues.state ? formValues.state : null,
            city: formValues.city,
            addon: this.addonId,
            subscriptioncycle: this.subscriptionCycle
        };

        this._logger.debug(sendData);

        this.buttonLoading = true;

        this._clientSubscriptionService.subscribeClient(sendData)
        .pipe(
            finalize(() => {
                this.buttonLoading = false;
            })
        )
        .subscribe(
            (response: {token: string}) => {

                this._logger.debug(response);

                this.subscribedEmail = this.subscriptionForm.get('email').value;
                this.verifyToken = response.token;

                setTimeout(() => {
                    this.isSubmitted = true;

                    if (this.scrollDirective) {
                        this.scrollDirective.scrollToTop();
                    }
                }, 300);

            },
            (error) => {

                if (error.error.data && error.error.data.violation) {
                    this.handleEmailValidation(error);
                }

                this.recaptchaComponent.resetCaptcha();
                throw error;
            }
        );

    }

    /**
     * Open terms dialog
     */
    openTermsDialog(): void {

        const dialogRef = this._dialogService.open(TermsDialogComponent, { disableClose: true });

    }

    /**
     * Resend Email Verification
     */
    resendVerfication(): void {

        // TODO
        this.buttonLoading = true;

        this._clientSubscriptionService.resendEmailVerification({token: this.verifyToken})
            .subscribe((response) => {
                this.buttonLoading = false;
            });

    }

    /**
     * Open email validation modal
     * @param error 
     */
    handleEmailValidation(error: any): void {
        
        const violation = error.error.data.violation;

        const opts = {
            nzTitle: 'Email Error',
            nzContent: SubscriptionEmailValidationComponent,
            nzComponentParams: {
                content: violation.message,
                button: violation.button,
                buttonLabel: violation.button_title,
                onClick: (() => {
                        
                    if (violation.status === 'email_verification') {

                        return new Promise((resolve, reject) => {

                            this._clientSubscriptionService.resendEmailVerification({token: violation.url})
                            .subscribe(
                                (response) => {
                                    resolve();
                                },
                                (err) => {
                                    reject(err);
                                }
                            );

                        });

                    
                    } else {

                        return new Promise((resolve) => {

                            setTimeout(() => {
                                window.open(violation.url);
                                resolve();
                            }, 500);
                            
                        });

                    }

                }).bind(this)
            },
            nzClosable: true,
            nzFooter: null
        };

        this._modalService.create(opts);

    }
    
}

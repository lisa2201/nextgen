import { Component, OnInit, ViewEncapsulation, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { takeUntil, finalize } from 'rxjs/operators';
import { Validators } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { ActivatedRoute } from '@angular/router';
import { MustMatch } from 'app/shared/validators/matchInputs';
import { DomSanitizer } from '@angular/platform-browser';
import { AppConst } from 'app/shared/AppConst';
import * as _ from 'lodash';

import { helpMotion } from 'ng-zorro-antd';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { fuseAnimations } from '@fuse/animations';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { FuseConfigService } from '@fuse/services/config.service';
import { ReCaptcha2Component } from 'ngx-captcha';
import { NzModalService } from 'ng-zorro-antd/modal';
import { MatIconRegistry } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { Country, Timezone, CityState } from 'app/shared/model/common.interface';
import { Addon } from '../../public/market-place/addon.model';
import { CommonService } from 'app/shared/service/common.service';
import { MarketPlaceService } from '../../public/market-place/services/market-place.service';
import { CustomPlanEmailValidationComponent } from './custom-plan-email-validation/custom-plan-email-validation.component';
import { TermsDialogComponent } from '../client-subscription/terms-dialog/terms-dialog.component';

@Component({
    selector: 'custom-plan',
    templateUrl: './custom-plan.component.html',
    styleUrls: ['./custom-plan.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]

})
export class CustomPlanComponent implements OnInit, OnDestroy, AfterViewInit {


    private _unsubscribeAll: Subject<any>;
    isVisible = false;

    // form
    subscriptionForm: FormGroup; // Subscription Form
    hidePassword: boolean; // Hide/Show Password

    isSubmitted: boolean;
    currentYear: number;
    recaptchaSiteKey: string;
    subscribedEmail: string;
    registrationMode: boolean;
    showHearAbout: boolean;
    subscriptionCycle: string;

    // common
    scrollDirective: FusePerfectScrollbarDirective | null; // Vertical Layout 1 scroll directive
    buttonLoading: boolean;

    // view features
    public addonId;
    public planId;
    public title;
    public selectedValue;

    // Email verification
    verifyMode: boolean;
    verifyToken: string;
    verifyProcessing: boolean;
    verfiySuccess: boolean;
    // verifyFail: boolean;
    showVerifyResend: boolean;
    verifyMessage: string;
    stateLoading: boolean;

    @ViewChild('captchaElem') recaptchaComponent: ReCaptcha2Component;


    paymentFrequencyList: string[] = [];
    howHearList: string[] = [];
    countriesList: Country[] = []; // Country Select
    timezoneListOriginal: Timezone[] = []; // Timezone Select
    timezoneList: Timezone[] = []; // Timezone Select Filtered
    stateList: CityState[] = []; // City States Select
    mediaChannels: string[];
    addon: Addon;


    constructor(
        private _formBuilder: FormBuilder,
        private iconRegistry: MatIconRegistry,
        private sanitizer: DomSanitizer,
        private _fuseConfigService: FuseConfigService,
        private _route: ActivatedRoute,
        private _commonService: CommonService,
        private _logger: NGXLogger,
        private _modalService: NzModalService,
        private _marketPlaceService: MarketPlaceService,
        private _dialogService: MatDialog,
    ) {

        iconRegistry.addSvgIcon(
            'unlock',
            sanitizer.bypassSecurityTrustResourceUrl('../../../../../assets/icons/material-icons/cust_plan/unlock.svg')


        );
        iconRegistry.addSvgIcon(
            'gift',
            sanitizer.bypassSecurityTrustResourceUrl('../../../../../assets/icons/material-icons/cust_plan/gift.svg')
        );

        iconRegistry.addSvgIcon(
            'invite',
            sanitizer.bypassSecurityTrustResourceUrl('../../../../../assets/icons/material-icons/cust_plan/invite.svg')


        );
        iconRegistry.addSvgIcon(
            'select',
            sanitizer.bypassSecurityTrustResourceUrl('../../../../../assets/icons/material-icons/cust_plan/select.svg')
        );
        iconRegistry.addSvgIcon(
            'help',
            sanitizer.bypassSecurityTrustResourceUrl('../../../../../assets/icons/material-icons/cust_plan/help.svg')


        );
        iconRegistry.addSvgIcon(
            'thumbs',
            sanitizer.bypassSecurityTrustResourceUrl('../../../../../assets/icons/material-icons/cust_plan/thumb.svg')
        );


        this.setFuseConfig();
        this._unsubscribeAll = new Subject();
        this.hidePassword = true;

        this.isSubmitted = false;
        this.currentYear = new Date().getFullYear();
        this.recaptchaSiteKey = AppConst.appKeys.recaptchaKey;
        this.paymentFrequencyList = AppConst.payment.PAYMENT_FREQUENCY.OWNER;
        this.buttonLoading = false;

        this.verfiySuccess = null;
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
            'Other'
        ];

        if (this._route.snapshot.queryParams['verify-token']) {
            this.verifyToken = this._route.snapshot.queryParams['verify-token'];
            this.registrationMode = false;
            this.verifyMode = true;
            this.verifyProcessing = true;

        } else {
            this.addonId = this._route.snapshot.queryParams['product'];
            this.subscriptionCycle = this._route.snapshot.queryParamMap.get(AppConst.queryParamKeys.MARKET_PLACE.subscriptionCycle);
            this.verifyProcessing = false;
            this.verifyMode = false;
            this.registrationMode = true;
        }
    }


    /**
     * On Init
     */
    ngOnInit(): void {

        if (this.registrationMode) {

            this._createForm();
            this._countryChange();
            this._setInitData();
            this._setScrollDirective();
            this._hearAboutChange();

        }
    }

    /**
     * set Init Data
     */
    _setInitData(): void {

        const resolveData = this._route.snapshot.data['resolveData'];

        if (!_.isEmpty(resolveData)) {
            this.countriesList = resolveData[0];
            this.timezoneListOriginal = resolveData[1];
            this.addon = resolveData[2].data;

        }

    }


    /**
     * Country Change
     */
    private _countryChange(): void {

        this.subscriptionForm.get('country').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((countryData: string) => {

                this._filterTimezone(countryData);
                // this._getStates(countryData);

            });

    }

    /**
     * Filter Time Zones
     * @param {string} code 
     */
    private _filterTimezone(code: string): void {

        const timezoneselect = this.subscriptionForm.get('timezone');

        if (timezoneselect.disabled) {
            timezoneselect.enable();
        }

        timezoneselect.reset();
        this.timezoneList = _.filter(this.timezoneListOriginal, { 'countryCode': code });
    }

    /**
     * Hear About Change
     */
    _hearAboutChange(): void {

        this.subscriptionForm.get('hearAbout').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value: string) => {

                const hearAboutOtherInput = this.subscriptionForm.get('hearAboutOther');

                if (value.toLowerCase() === 'other') {

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
     * After View Init
     */
    ngAfterViewInit(): void {

        setTimeout(() => {
            this._verifyEmail();
        }, 1000);

    }

    /**
     * On Destroy
     */
    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    /**
     * Fuse 
     */
    private setFuseConfig(): void {
        this._fuseConfigService.config = {
            layout: {
                style: 'vertical-layout-1',
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
     * Scroll Directive
     */
    private _setScrollDirective(): void {

        this._commonService.verticalLayout1ScrollDirective
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((directive: FusePerfectScrollbarDirective | null) => {
                this.scrollDirective = directive;
            });

    }

    /**
     * Form
     */
    private _createForm(): void {

        this.subscriptionForm = this._formBuilder.group(
            {

                first_name: ['', Validators.required],
                last_name: ['', Validators.required],
                company_name: ['', Validators.required],
                email: ['', { validators: [Validators.required, Validators.email], updateOn: 'blur' }],
                password: ['', { validators: [Validators.required, Validators.minLength(7)], updateOn: 'blur' }],
                confirmPassword: ['', { validators: [Validators.required], updateOn: 'blur' }],
                companycode: ['', Validators.required],
                country: [null, Validators.required],
                timezone: [null, Validators.required],
                postalCode: ['', Validators.required],
                state: ['', Validators.required],

                address_1: ['', Validators.required],
                address_2: [''],
                city: ['', Validators.required],

                // country_code: ['+94', Validators.required],
                phone_number: ['', Validators.required],

                payment_frequency: [null, Validators.required],
                hearAbout: [null],
                hearAboutOther: [''],

                no_of_branches: [''],
                no_of_children: [''],
                organization_type: [''],
                // how_did_you_hear: [''],
                // recaptchaReactive: new FormControl('', Validators.required),
                agreement: [false, Validators.requiredTrue],
                recaptcha: ['', Validators.required]
            },
            {
                validators: MustMatch('password', 'confirmPassword')
            }
        );
        // Async Validator Fix
        setTimeout(() => {
            // this.subscriptionForm.get('email').setAsyncValidators([valueExists(this._commonService, 'user.email')]);
            // this.subscriptionForm.get('email').updateValueAndValidity();
            this.subscriptionForm.get('timezone').disable();
            // this.subscriptionForm.get('state').disable();
        }, 100);
    }

    /**
     * Email Verify
     */
    private _verifyEmail(): void {
        this._marketPlaceService.verifyEmail({ token: this.verifyToken })
            .pipe(
                finalize(() => {
                    this.verifyProcessing = false;
                })
            )
            .subscribe(
                (response: { active: boolean, expired: boolean, message: string }) => {
                    this._logger.info(response);

                    this.verifyMessage = response.message;

                    if (response.active) {
                        this.verfiySuccess = true;
                    } else {

                        if (response.expired) {
                            this.showVerifyResend = true;
                        } else {

                            this.verfiySuccess = false;
                        }

                    }
                }
            );
    }


    //   handleOk(): void {
    //     this.isVisible = false;
    //   }

    //   handleCancel(): void {
    //     this.isVisible = false;
    //   }

    //   navigate() {
    //     this.isSubmitted = true;
    //   }



    /**
     * Email Validation Modals
     * @param error 
     */
    //   createCustomButtonModal(error): void {

    //     if (error.error.data.msg == 'pending') { //4


    //       const modal: NzModalRef = this.modalService.create({
    //         nzTitle: error.error.message,
    //         nzContent: 'If you did not receive the email, Please use resend button to receive the mail.',
    //         nzFooter: [
    //           {
    //             label: 'Resend Email',
    //             type: 'primary',
    //             onClick: () => [this.navigate(), modal.destroy()]
    //           },
    //           {
    //             label: 'Close',
    //             type: 'default',
    //             onClick: () => modal.destroy()
    //           }],
    //       });




    //     } else if (error.error.data.msg == 'active') {  //1

    //       const modal: NzModalRef = this.modalService.create({
    //         nzTitle: error.error.message,
    //         nzContent: 'Thank you for subscribing. We are glad to serve you. We ensure to provide best quality services with higher standards.',
    //         nzFooter: [
    //           {
    //             label: 'Go to Sitemanager',
    //             type: 'danger',
    //             onClick: () => [this.router.navigateByUrl('http://site-manager.localhost:4200/'), modal.destroy()]
    //           },
    //           {
    //             label: 'Close',
    //             type: 'default',
    //             onClick: () => modal.destroy()
    //           }],
    //       });
    //     }



    //     else if (error.error.data.msg == 'inactive') {  //2

    //       const modal: NzModalRef = this.modalService.create({
    //         nzTitle: error.error.message,
    //         nzContent: 'You have an verified account. Please use welcome mail to activate the sitemanager.',
    //         nzFooter: [
    //           {
    //             label: 'Go to Sitemanager',
    //             type: 'danger',
    //             onClick: () => [this.router.navigateByUrl('http://portal.localhost:4200/'), modal.destroy()]
    //           },
    //           {
    //             label: 'Close',
    //             type: 'default',
    //             onClick: () => modal.destroy()
    //           }],
    //       });




    //     } else if (error.error.data.msg == 'expired') { //3

    //       const modal: NzModalRef = this.modalService.create({
    //         nzTitle: error.error.message,
    //         nzContent: 'We are sorry, But your trial period has expired. Please contact your service provider to reactivate your trial.',
    //         nzFooter: [
    //           {
    //             label: 'Reactivate My Trial',
    //             type: 'primary',
    //             onClick: () => this.handleCancel()
    //           },
    //           {
    //             label: 'Close',
    //             type: 'default',
    //             onClick: () => modal.destroy()
    //           }],
    //       });

    //     } else if (error.error.data.msg == 'deactivated') { //4

    //       const modal: NzModalRef = this.modalService.create({
    //         nzTitle: error.error.message,
    //         nzContent: 'We are sorry, Your account has been deactivated. Please contact your service provider to reactivate your trial.',
    //         nzFooter: [
    //           {
    //             label: 'Close',
    //             type: 'default',
    //             onClick: () => modal.destroy()
    //           }],
    //       });

    //     } else if (error.error.data.msg == 'verification') { //4

    //       const modal: NzModalRef = this.modalService.create({
    //         nzTitle: error.error.message,
    //         nzContent: 'We are glad to serve you. Please Wait..',
    //         nzFooter: [
    //           {
    //             label: 'Close',
    //             type: 'default',
    //             onClick: () => modal.destroy()
    //           }],
    //       });


    //     } else {

    //       const modal: NzModalRef = this.modalService.create({  //5
    //         nzTitle: error.error.message,
    //         nzContent: 'You cannot create an Account with this e-mail!',
    //         nzFooter: [
    //           {
    //             label: 'Close',
    //             type: 'default',
    //             onClick: () => modal.destroy()
    //           }],
    //       });
    //     }


    //   }



    /**
     * On submit
     */
    onSubmit(): void {

        if (!this.subscriptionForm.valid) {
            return;
        }

        const formValues = this.subscriptionForm.value;

        const sendData = {
            addon_id: this.addonId,
            first_name: formValues.first_name,
            last_name: formValues.last_name,
            company_name: formValues.company_name,
            email: formValues.email,
            password: formValues.password,
            address_1: formValues.address_1,
            address_2: formValues.address_2,
            city: formValues.city,
            // country_code: formValues.country_code,

            timezone: formValues.timezone,
            country: formValues.country,
            postalCode: formValues.postalCode,
            // state: formValues.state ? formValues.state : null,
            state: formValues.state,
            companycode: formValues.country ? (formValues.country === 'AU' ? formValues.companycode : null) : null,

            phone_number: formValues.phone_number,
            payment_frequency: formValues.payment_frequency,

            no_of_branches: formValues.no_of_branches,
            organization_type: formValues.organization_type,

            hearAboutOther: formValues.hearAboutOther,
            hearAbout: formValues.hearAbout,
            subscriptioncycle: this.subscriptionCycle
            // hearAbout: formValues.hearAbout,
            // how_did_you_hear: formValues.how_did_you_hear

        };

        this._logger.debug(sendData);

        this.buttonLoading = true;


        this._marketPlaceService
            .register_cust_plan(sendData)
            .pipe(
                finalize(() => {
                    this.buttonLoading = false;
                })
            )
            .subscribe(
                (response) => {
                    this.subscribedEmail = this.subscriptionForm.get('email').value;
                    this.verifyToken = response.verifyToken;

                    // this.router.navigate(['/marketplace/success']);
                    // console.log(response);

                    setTimeout(() => {
                        this.isSubmitted = true;
                        if (this.scrollDirective) {
                            this.scrollDirective.scrollToTop(0);
                        }
                    }, 300);

                },
                (error) => {
                    // this.recaptchaComponent.resetCaptcha();
                    // // throw error;
                    // // console.log(error.error.data.url);
                    // // this. createBasicNotification(error);
                    // // this.createBasicNotification1(template);
                    // this.createCustomButtonModal(error);

                    if (error.error.data && error.error.data.violation) {
                        this.handleEmailValidation(error);
                    }
                    this.recaptchaComponent.resetCaptcha();
                    throw error;

                }
            );
    }

    /**
     * Resend Verification
     */
    resendVerfication(): void {

        // TODO
        this.buttonLoading = true;
        // this.subscribedEmail = this.subscriptionForm.get('email').value;

        this._marketPlaceService
            .resend_email({ token: this.verifyToken })
            .subscribe(
                (response) => {

                    setTimeout(() => {
                        this.buttonLoading = false;

                        if (!this.isSubmitted) {
                            this.subscribedEmail = this.subscriptionForm.get('email').value;
                            this.isSubmitted = true;
                            this.verifyMode = false;
                        }



                    }, 3000);

                }
            );
    }


    /**
     * email validations
     */
    handleEmailValidation(error: any): void {

        const violation = error.error.data.violation;

        const opts = {
            nzTitle: 'Email Error',
            nzContent: CustomPlanEmailValidationComponent,
            nzComponentParams: {
                content: violation.message,
                button: violation.button,
                buttonLabel: violation.button_title,
                onClick: (() => {

                    if (violation.status === 'email_verification') {

                        return new Promise((resolve, reject) => {

                            this._marketPlaceService.resend_email({ token: violation.url })
                                .subscribe(
                                    (response) => {
                                        resolve();
                                    },
                                    (err) => {
                                        reject(err);
                                    }
                                );

                        });


                    }else if (violation.status === 'quotation_acceptance') {

                        return new Promise((resolve, reject) => {

                            this._marketPlaceService.resendQuotation({ token: violation.url })
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


    /**
        * Open terms dialog
        */
    openTermsDialog(): void {

        const dialogRef = this._dialogService.open(TermsDialogComponent, { disableClose: true });

    }




}



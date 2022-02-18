import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { fadeInOnEnterAnimation, fadeOutOnLeaveAnimation } from 'angular-animations';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';


import { FuseConfigService } from '@fuse/services/config.service';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import * as _ from 'lodash';
import { CreditCardValidators } from 'angular-cc-library';
import { takeUntil } from 'rxjs/operators';

import { Country } from 'app/shared/model/common.interface';
import { CommonService } from 'app/shared/service/common.service';
import { NotificationService } from 'app/shared/service/notification.service';
import { AppConst } from 'app/shared/AppConst';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { PaymentStartupService } from './services/payment-startup.service';
import { PaymentMethodsService } from '../payment-methods/services/payment-methods.service';

@Component({
    selector: 'app-payment-register',
    templateUrl: './payment-register.component.html',
    styleUrls: ['./payment-register.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
        fadeInOnEnterAnimation({ duration: 300 }),
        fadeOutOnLeaveAnimation({ duration: 300 })
    ]
})
export class PaymentRegisterComponent implements OnInit, OnDestroy {

    private unsubscribeAll: Subject<any>;

    paymentForm: FormGroup;
    countriesList: Country[];
    organization: any;
    ezidebitId: string;
    currentYear: number;
    newEzidebit: boolean;
    buttonLoading: boolean;
    stripe: boolean;
    radioStyle: {};
    ezidebitBaseUrl: string;
    eddrUrl: string;
    publicKey: string;

    constructor(
        private _formBuilder: FormBuilder,
        private _paymentStartupService: PaymentStartupService,
        private _paymentMethodsService: PaymentMethodsService,
        private _logger: NGXLogger,
        private _fuseConfigService: FuseConfigService,
        private _notificationService: NotificationService,
        private _route: ActivatedRoute,
        private _router: Router
    ) {
        
        this.setFuseConfig();
        this.unsubscribeAll = new Subject();
        this.countriesList = [];
        this.currentYear = new Date().getFullYear();
        this.newEzidebit = true;
        this.buttonLoading = false;
        this.radioStyle = {
            display: 'block',
            height: '30px',
            lineHeight: '30px'
        };
        
    }

    // -----------------------------------------------------------------------------------------------------
    // Lifecycle Hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init hook
     */
    ngOnInit(): void {

        const resolveData = this._route.snapshot.data['resolveData'];

        if (!_.isEmpty(resolveData)) {
            this.countriesList = resolveData[0];
            this.ezidebitId = resolveData[1].reference;
            this.eddrUrl = resolveData[1].eddr_url;
            this.publicKey = resolveData[1].public_key;
            this.organization = resolveData[2];

            if (this.organization.country === 'AU') {
                this.stripe = false;
            } else {
                this.stripe = true;
            }
        }

        this.ezidebitBaseUrl = `${this.eddrUrl}?a=${this.publicKey}&debits=4&businessOrPerson=2`;

        this.createForm();
        this.initFormValidation();
        this.orgContactChange();
    }

    /**
     * On destroy hook
     */
    ngOnDestroy(): void {

        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Set fuse config
     */
    setFuseConfig(): void {

        this._fuseConfigService.config = {
            layout: {
                navbar: {
                    hidden: true
                },
                toolbar: {
                    hidden: false
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
     * Create form
     */
    createForm(): void {

        this.paymentForm = this._formBuilder.group({
            paymentDetails: this._formBuilder.group({
                stripeDetails: this._formBuilder.group({
                    cardName: [''],
                    cardNumber: ['', [Validators.required, CreditCardValidators.validateCCNumber]],
                    cardExpiry: ['', [Validators.required, CreditCardValidators.validateExpDate]],
                    cardCvc: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]]
                }, {
                    // updateOn: 'blur'
                }),
                ezidebitDetails: this._formBuilder.group({
                    ezidebitAgree: [false, Validators.requiredTrue],
                    ezidebitRef: [this.ezidebitId ? this.ezidebitId : '', [Validators.required]],
                    ezidebitMode: ['0']
                })
            }),
            contactDetails: this._formBuilder.group({
                firstName: ['', Validators.required],
                lastName: ['', Validators.required],
                phone: ['', Validators.required],
                address1: ['', Validators.required],
                address2: [''],
                city: ['', Validators.required],
                zip: ['', Validators.required],
                country: [null, Validators.required],
                state: ['', Validators.required]
            }),
            orgContact: [false]
        });

    }

    /**
     * Form validation
     */
    initFormValidation(): void {

        setTimeout(() => {

            if (this.stripe) {
                this.paymentForm.get('paymentDetails.ezidebitDetails').disable({ emitEvent: false });
            } else {
                this.paymentForm.get('paymentDetails.stripeDetails').disable({ emitEvent: false });
                this.paymentForm.get('paymentDetails.ezidebitDetails.ezidebitRef').disable({ emitEvent: false });
            }

        }, 100);

    }

    /**
     * Use organization contact handler
     */
    orgContactChange(): void {

        this.paymentForm.get('orgContact').valueChanges
            .pipe(
                takeUntil(this.unsubscribeAll)
            )
            .subscribe((value: boolean) => {

                if (value) {
                    this.paymentForm.get('contactDetails').disable({ emitEvent: false });
                } else {
                    this.paymentForm.get('contactDetails').enable({ emitEvent: false });
                }

            });

    }

    /**
     * Submit handler
     * @returns {Promise}
     */
    async onSubmit(): Promise<any> {

        if (!this.paymentForm.valid) {
            return;
        }

        this.buttonLoading = true;

        const contactDetails = this.paymentForm.get('contactDetails').value;
        const payDetails = this.paymentForm.get('paymentDetails.stripeDetails').value;

        const sendData = {
            firstname: contactDetails.firstName,
            lastname: contactDetails.lastName,
            phone: contactDetails.phone,
            address1: contactDetails.address1,
            address2: contactDetails.address2 ? contactDetails.address2 : null,
            city: contactDetails.city,
            zip: contactDetails.zip,
            country: contactDetails.country,
            state: contactDetails.state,
            reference: null,
            orgid: this.organization.id,
            orgcontact: this.paymentForm.get('orgContact').value
        };

        if (this.stripe) {

            // Separate try catch block for stripe specific error
            try {

                const stripeToken = await this._paymentMethodsService.getStripeToken(payDetails.cardName, payDetails.cardNumber, payDetails.cardExpiry, payDetails.cardCvc, this.publicKey);
                sendData.reference = stripeToken;

            } catch (error) {
                this._logger.debug(['stripeError'], error);
                this._notificationService.displaySnackBar(error.error.message, NotifyType.ERROR);
                this.buttonLoading = false;
                return;
            }

        } else {
            sendData.reference = this.paymentForm.get('paymentDetails.ezidebitDetails.ezidebitRef').value;
        }

        this._logger.debug(sendData);

        try {

            const resp = await this._paymentStartupService.completePaymentInfo(sendData).toPromise();

            this.buttonLoading = false;

            this._router.navigate([AppConst.appStart.PORTAL.DEFAULT_AUTH_URL]);

        } catch (error) {
            this.buttonLoading = false;
            throw error;
        }

    }

    /**
     * Ezidebit mode handler
     * @param {string} mode
     */
    onRadioChange(mode: string): void {

        const ezidebitAgreeRef = this.paymentForm.get('paymentDetails.ezidebitDetails.ezidebitAgree');
        const ezidebitIDRef = this.paymentForm.get('paymentDetails.ezidebitDetails.ezidebitRef');

        if (mode === '0') {
            this.newEzidebit = true;
            if (ezidebitAgreeRef.disabled) {
                ezidebitAgreeRef.enable({ emitEvent: false });
            }

            ezidebitIDRef.disable({ emitEvent: false });

        } else {
            this.newEzidebit = false;
            if (ezidebitIDRef.disabled) {
                ezidebitIDRef.enable({ emitEvent: false });
            }

            ezidebitAgreeRef.disable({ emitEvent: false });

        }

    }

    /**
     * Ezidebit eDDR form link handler
     */
    goToEddrForm(): void {

        // tslint:disable-next-line: max-line-length
        const url = `${this.ezidebitBaseUrl}&uRef=${this.ezidebitId}&email=${this.organization.email}&lName=${this.organization.name}&mobile=${this.organization.phone}&addr=${this.organization.address1}&addr2=${this.organization.address2}&suburb=${this.organization.city}&pCode=${this.organization.zipcode}&oDate=03-03-2020`;

        window.open(url);

    }

}

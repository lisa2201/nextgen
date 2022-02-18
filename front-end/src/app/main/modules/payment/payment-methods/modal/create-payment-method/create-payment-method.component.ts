import { Component, OnInit, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Country } from 'app/shared/model/common.interface';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CreditCardValidators } from 'angular-cc-library';
import { Subject } from 'rxjs';
import { CommonService } from 'app/shared/service/common.service';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { takeUntil } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { fuseAnimations } from '@fuse/animations';
import { helpMotion } from 'ng-zorro-antd';
import { PaymentMethodsService } from '../../services/payment-methods.service';
import { AppConst } from 'app/shared/AppConst';

@Component({
    selector: 'app-create-payment-method',
    templateUrl: './create-payment-method.component.html',
    styleUrls: ['./create-payment-method.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class CreatePaymentMethodComponent implements OnInit {

    
    private unsubscribeAll: Subject<any>;
    
    paymentForm: FormGroup;
    countries: Country[];
    organization: any;
    ezidebitId: string;
    newEzidebit: boolean;
    buttonLoading: boolean;
    stripe: boolean;
    radioStyle: {};
    ezidebitBaseUrl: string;
    eddrUrl: string;
    publicKey: string;

    constructor(
        public matDialogRef: MatDialogRef<CreatePaymentMethodComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _paymentMethodsService: PaymentMethodsService,
        private _commonService: CommonService,
        private _logger: NGXLogger,
        private _notificationService: NotificationService,
    ) {

        this.unsubscribeAll = new Subject();
        this.countries = _data.countries;
        this.ezidebitId = _data.ezidebitRef;
        this.organization = _data.organization;
        this.eddrUrl = _data.eddrUrl;
        this.publicKey = _data.ezidebitPublicKey;
        this.newEzidebit = true;
        this.buttonLoading = false;
        this.radioStyle = {
            display: 'block',
            height: '30px',
            lineHeight: '30px'
        };
        this.ezidebitBaseUrl = `${this.eddrUrl}?a=${this.publicKey}&debits=4&businessOrPerson=2`;

        if (this.organization.country === 'AU') {
            this.stripe = false;
        } else {
            this.stripe = true;
        }

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        this.createForm();
        this.initFormValidation();
        this.orgContactChange();

    }

    // -----------------------------------------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------------------------------------

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
     * Initialize form validation
     */
    initFormValidation(): void {

        setTimeout(() => {

            if (this.stripe) {
                this.paymentForm.get('paymentDetails.ezidebitDetails').disable({ emitEvent: false });
            } else {
                this.paymentForm.get('paymentDetails.stripeDetails').disable({ emitEvent: false });
                this.paymentForm.get('paymentDetails.ezidebitDetails.ezidebitRef').disable({ emitEvent: false });
                this.paymentForm.get('contactDetails.country').patchValue('AU', {emitEvent: false});
                this.paymentForm.get('contactDetails.country').disable();
            }

        }, 100);

    }

    /**
     * Contact change handler
     */
    orgContactChange(): void {

        this.paymentForm.get('orgContact').valueChanges
            .pipe(takeUntil(this.unsubscribeAll))
            .subscribe((value: boolean) => {

                if (value) {
                    this.paymentForm.get('contactDetails').disable({ emitEvent: false });
                } else {
                    this.paymentForm.get('contactDetails').enable({ emitEvent: false });
                }

            });

    }

    /**
     * Ezidebit type change handler
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
     * Form submit handler
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
            country: this.paymentForm.controls['contactDetails']['controls']['country']['value'],
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

            const resp = await this._paymentMethodsService.completePaymentInfo(sendData).toPromise();

            this.buttonLoading = false;

            setTimeout(() => {
                this.matDialogRef.close(resp);
            }, 250);

        } catch (error) {
            this.buttonLoading = false;
            throw error;
        }

    }

    /**
     * Ezidebit link handler
     */
    goToEddrForm(): void {

        // tslint:disable-next-line: max-line-length
        const url = `${this.ezidebitBaseUrl}&uRef=${this.ezidebitId}&email=${this.organization.email}&lName=${this.organization.name}&mobile=${this.organization.phone}&addr=${this.organization.address1}&addr2=${this.organization.address2}&suburb=${this.organization.city}&pCode=${this.organization.zipcode}`;

        window.open(url);

    }
}

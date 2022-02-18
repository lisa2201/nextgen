import { Component, OnInit, ViewEncapsulation, Inject, ViewChild } from '@angular/core';
import { helpMotion } from 'ng-zorro-antd';
import { fuseAnimations } from '@fuse/animations';
import { Subject } from 'rxjs';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Country } from 'app/shared/model/common.interface';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ParentPaymentMethodsService } from '../../services/parent-payment-methods.service';
import { CommonService } from 'app/shared/service/common.service';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'app/shared/service/notification.service';
import { CreditCardValidators } from 'angular-cc-library';
import { takeUntil } from 'rxjs/operators';
import { NotifyType } from 'app/shared/enum/notify-type.enum';
import { User } from 'app/main/modules/user/user.model';
import { AppConst } from 'app/shared/AppConst';
import { FusePerfectScrollbarDirective } from '@fuse/directives/fuse-perfect-scrollbar/fuse-perfect-scrollbar.directive';
import { updateScrollPosition } from 'app/shared/enum/update-scroll-position';

@Component({
    selector: 'app-create-parent-payment-method',
    templateUrl: './create-parent-payment-method.component.html',
    styleUrls: ['./create-parent-payment-method.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        helpMotion,
        fuseAnimations,
    ]
})
export class CreateParentPaymentMethodComponent implements OnInit {

private unsubscribeAll: Subject<any>;

    paymentForm: FormGroup;
    countries: Country[];
    user: User;
    ezidebitId: string;
    validAddress: boolean;
    provider: string;
    newEzidebit: boolean;
    buttonLoading: boolean;
    stripe: boolean;
    radioStyle: {};
    ezidebitBaseUrl: string;
    publicKey: string;
    eddrUrl: string;
    bpayselected: boolean;
    hasBpay: boolean;

    @ViewChild(FusePerfectScrollbarDirective)
    directiveScroll: FusePerfectScrollbarDirective;

    constructor(
        public matDialogRef: MatDialogRef<CreateParentPaymentMethodComponent>,
        private _formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) private _data: any,
        private _parentPaymentMethodsService: ParentPaymentMethodsService,
        private _commonService: CommonService,
        private _logger: NGXLogger,
        private _notificationService: NotificationService,
    ) {

        this.unsubscribeAll = new Subject();
        this.countries = this._data.countries;
        this.ezidebitId = this._data.ezidebit_ref;
        this.provider = this._data.provider;
        this.validAddress = this._data.valid_address;
        this.publicKey = this._data.public_key;
        this.user = this._data.user ? new User(this._data.user) : null;
        this.eddrUrl = this._data.eddr_url;
        this.newEzidebit = true;
        this.hasBpay = this._data.has_bpay;
        this.bpayselected = false;
        this.buttonLoading = false;
        this.radioStyle = {
            display: 'block',
            height: '30px',
            lineHeight: '30px'
        };
        this.ezidebitBaseUrl = `${this.eddrUrl}?a=${this.publicKey}&debits=4&businessOrPerson=1`;

        if (this.provider === AppConst.payment.PARENT_PAYMENT_PROVIDERS.STRIPE) {
            this.stripe = true;
        } else {
            this.stripe = false;
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
        this.prefillUser();     

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
                    cardName: ['', [Validators.required]],
                    cardNumber: ['', [Validators.required, CreditCardValidators.validateCCNumber]],
                    cardExpiry: ['', [Validators.required, CreditCardValidators.validateExpDate]],
                    cardCvc: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]]
                }, {
                    // updateOn: 'blur'
                }),
                ezidebitDetails: this._formBuilder.group({
                    ezidebitAgree: [false, Validators.requiredTrue],
                    ezidebitRef: ['', [Validators.required]],
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
                this.paymentForm.get('contactDetails.country').disable({ emitEvent: false });
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
     * Pre fill user
     */
    prefillUser(): void {
        
        if (this.user) {
            const contactDetails = this.paymentForm.get('contactDetails');

            contactDetails.get('firstName').patchValue(this.user.firstName, {emitEvent: false});
            contactDetails.get('lastName').patchValue(this.user.lastName, {emitEvent: false});
            contactDetails.get('phone').patchValue(this.user.phoneNumber, {emitEvent: false});
            contactDetails.get('address1').patchValue(this.user.address1, {emitEvent: false});
            contactDetails.get('address2').patchValue(this.user.address2, {emitEvent: false});
            contactDetails.get('city').patchValue(this.user.city, {emitEvent: false});
            contactDetails.get('zip').patchValue(this.user.zipCode, {emitEvent: false});
            contactDetails.get('state').patchValue(this.user.state, {emitEvent: false});

        }

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
            this.bpayselected = false;
            if (ezidebitAgreeRef.disabled) {
                ezidebitAgreeRef.enable({ emitEvent: false });
            }

            ezidebitIDRef.disable({ emitEvent: false });

        } else if (mode === '1') {

            this.bpayselected = false;
            this.newEzidebit = false;
            if (ezidebitIDRef.disabled) {
                ezidebitIDRef.enable({ emitEvent: false });
            }

            ezidebitAgreeRef.disable({ emitEvent: false });

        } else if (mode === '2') {

            this.bpayselected = true;
            ezidebitIDRef.disable({ emitEvent: false });
            ezidebitAgreeRef.disable({ emitEvent: false });

        }

        this.updateScroll();        

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
            profilecontact: this.paymentForm.get('orgContact').value,
            user_id: this.user ? this.user.id : null,
            ezidebit_mode: this.paymentForm.get('paymentDetails.ezidebitDetails.ezidebitMode').value
        };

        if (this.stripe) {

            // Separate try catch block for stripe specific error
            try {

                const stripeToken = await this._parentPaymentMethodsService.getStripeToken(payDetails.cardName, payDetails.cardNumber, payDetails.cardExpiry, payDetails.cardCvc, this.publicKey);
                sendData.reference = stripeToken;

            } catch (error) {
                this._logger.debug(['stripeError'], error);
                this._notificationService.displaySnackBar(error.error.message, NotifyType.ERROR);
                this.buttonLoading = false;
                return;
            }

        } else {

            if (this.newEzidebit === false && this.bpayselected ===  false) {
                sendData.reference = this.paymentForm.get('paymentDetails.ezidebitDetails.ezidebitRef').value;
            } else {
                sendData.reference = this.ezidebitId;
            }

        }

        this._logger.debug(sendData);

        try {

            const resp = await this._parentPaymentMethodsService.storePaymentMethod(sendData).toPromise();

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
        let url = `${this.ezidebitBaseUrl}&uRef=${this.ezidebitId}&email=${this.user.email}`;

        const contactDetails = this.paymentForm.get('contactDetails');

        if (contactDetails.get('firstName').value) {
            url = url + `&fName=${contactDetails.get('firstName').value}`;
        }

        if (contactDetails.get('lastName').value) {
            url = url + `&lName=${contactDetails.get('lastName').value}`;
        }

        if (contactDetails.get('phone').value) {
            url = url + `&mobile=${contactDetails.get('phone').value}`;
        }

        if (contactDetails.get('address1').value) {
            url = url + `&addr=${contactDetails.get('address1').value}`;
        }

        if (contactDetails.get('address2').value) {
            url = url + `&addr2	=${contactDetails.get('address2').value}`;
        }

        if (contactDetails.get('city').value) {
            url = url + `&suburb=${contactDetails.get('city').value}`;
        }

        if (contactDetails.get('zip').value) {
            url = url + `&pCode=${contactDetails.get('zip').value}`;
        }

        if (contactDetails.get('state').value) {
            url = url + `&state=${contactDetails.get('state').value}`;
        }

        window.open(url);

    }

    updateScroll(): void {
        setTimeout(() => {
            this._commonService.updateScrollBar(this.directiveScroll, updateScrollPosition.BOTTOM, 0);
            this._commonService.triggerResize();
        }, 200)
    }
}

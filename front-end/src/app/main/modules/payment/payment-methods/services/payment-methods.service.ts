import { Injectable } from '@angular/core';
import { PaymentMethod } from '../payment-method.model';
import { Subject, Observable } from 'rxjs';
import { CommonService } from 'app/shared/service/common.service';
import { AppConst } from 'app/shared/AppConst';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, tap, shareReplay } from 'rxjs/operators';
import * as _ from 'lodash';

declare const Stripe: any;

@Injectable()
export class PaymentMethodsService {

    private paymentMethods: PaymentMethod[];

    onPaymentMethodsChanged: Subject<PaymentMethod[]>;

    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _commonService: CommonService
    ) {
        this.paymentMethods = [];
        this.onPaymentMethodsChanged = new Subject();
    }


    /**
     * List payment methods
     * @returns {Observable}
     */
    listPaymentMethods(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/payment_informations`, {})
            .pipe(
                map(response => _.map(response.data, (item, index: number) => new PaymentMethod(item, index))),
                tap(data => this.paymentMethods = data),
                shareReplay(),
            );

    }

    /**
     * Complete payment information
     * @param {any} postData
     * @returns {Observable}
     */
    completePaymentInfo(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/subscribe_payment_info`, postData)
            .pipe(
                shareReplay(),
                map((response) => {

                    if (response.data && _.keys(response.data).length > 0) {

                        _.forEach(this.paymentMethods, (method: PaymentMethod) => method.setStatus(false));

                        const item = new PaymentMethod(response.data, this.paymentMethods.length);
                        item.isNew = true;

                        this.paymentMethods.push(item);

                        setTimeout(() => this.onPaymentMethodsChanged.next([...this.paymentMethods]), 200);
                    }

                    return response.message;

                })
            );

    }

    /**
     * Delete payment method
     * @param {string} index
     * @returns {Observable}
     */
    deletePaymentMethod(index: string): Observable<any> {

        const params = new HttpParams().set('id', index);

        return this._httpClient
            .delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/payment-method`, { params })
            .pipe(
                map(response => {

                    this.paymentMethods = this.paymentMethods.filter((i) => i.id !== index).map((v, i) => {
                        v.index = i;
                        return v;
                    });

                    setTimeout(() => this.onPaymentMethodsChanged.next([...this.paymentMethods]), 300);

                    return response.message;
                }),
                shareReplay()
            );

    }

    /**
     * Set default payment method
     * @param {string} id 
     * @param {number} index
     * @param {Observable} 
     */
    setDefaultPaymentMethod(id: string, index: number): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/default-payment-method`, { id })
            .pipe(
                map(response => {

                    if (this.paymentMethods[index]) {
                        _.forEach(this.paymentMethods, val => val.setStatus(false));
                        this.paymentMethods[index].setStatus(true);
                        this.onPaymentMethodsChanged.next([...this.paymentMethods]);
                    }

                    return response.message;
                }),
                shareReplay()
            );

    }


    /**
     * Get organization
     * @returns {Promise}
     */
    getOrg(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-org`, {})
            .pipe(
                map((response) => response.data),
                shareReplay()
            );

    }

    /**
     * Get ezidebit reference
     * @returns {Promise}
     */
    getEzidebitId(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/payment_ezidebit_reference`, {})
            .pipe(
                map(response => response.data),
                shareReplay()
            );

    }

    /**
     * 
     * @param {string} exp 
     * @returns {Object}
     */
    splitCardExp(exp: string): { month: string, year: string } {

        const expSplit = exp.split('/');

        return { month: expSplit[0].trim(), year: expSplit[1].trim() };

    }

    /**
     * Get stripe token
     * @param {string} cardname 
     * @param {string} cardnumber
     * @param {string} expiry
     * @param {string} cvc
     * @returns {Promise}
     */
    getStripeToken(cardname: string, cardnumber: string, expiry: string, cvc: string, publicKey: string): Promise<any> {

        return new Promise((resolve, reject) => {

            if (_.isEmpty(cardname) || _.isEmpty(cardnumber) || _.isEmpty(expiry) || _.isEmpty(cvc)) {
                return reject({ error: { message: 'Enter the card details' } });
            }

            const cardNum = cardnumber;
            const cardName = cardname;
            const cardExp = this.splitCardExp(expiry);
            const cardExpMonth = cardExp.month;
            const cardExpYear = cardExp.year;
            const cardCvc = cvc;

            this._commonService.loadScript(AppConst.stripeLibraryUrl)
                .subscribe(() => {

                    Stripe.setPublishableKey(publicKey);

                    Stripe.card.createToken({
                        name: cardName,
                        number: cardNum,
                        exp_month: cardExpMonth,
                        exp_year: cardExpYear,
                        cvc: cardCvc
                    }, (status: number, response: any) => {
                        if (status === 200) {
                            return resolve(response.id);
                        } else {
                            return reject(response);
                        }

                    });
                });


        });

    }


}

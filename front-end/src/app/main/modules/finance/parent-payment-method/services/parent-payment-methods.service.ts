import { Injectable } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { CommonService } from 'app/shared/service/common.service';
import { AppConst } from 'app/shared/AppConst';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, tap, shareReplay } from 'rxjs/operators';
import * as _ from 'lodash';
import { ParentPaymentMethod } from '../parent-payment-method.model';
import { User } from 'app/main/modules/user/user.model';

declare const Stripe: any;

@Injectable()
export class ParentPaymentMethodsService {

    private paymentMethods: ParentPaymentMethod[];
    private user: User;

    onPaymentMethodsChanged: BehaviorSubject<ParentPaymentMethod[]>;
    onUserChanged: BehaviorSubject<User | null>;

    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _commonService: CommonService
    ) {
        this.paymentMethods = [];
        this.user = null;
        this.onPaymentMethodsChanged = new BehaviorSubject([]);
        this.onUserChanged = new BehaviorSubject(null);
    }


    /**
     * List payment methods
     * @returns {Observable}
     */
    listPaymentMethods(userId?: string): Promise<any> {

        const params = new HttpParams().set('user_id', userId);

        return new Promise((resolve, reject) => {

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-methods-list`, { params })
                .pipe(
                    map(response => {
                        this.paymentMethods = _.map(response.data, (item, index: number) => new ParentPaymentMethod(item, index));
                        if (response.user) {
                            this.user = new User(response.user);
                        }
                    }),
                    shareReplay(),
                )
                .subscribe(
                    (response) => {
                        this.onPaymentMethodsChanged.next([...this.paymentMethods]);
                        this.onUserChanged.next(this.user);
                        resolve(null);
                    },
                    reject
                );

        });


    }

    /**
     * Complete payment information
     * @param {any} postData
     * @returns {Observable}
     */
    storePaymentMethod(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-method-store`, postData)
            .pipe(
                shareReplay(),
                map((response) => {

                    if (response.data && _.keys(response.data).length > 0) {

                        _.forEach(this.paymentMethods, (method: ParentPaymentMethod) => method.setStatus(false));

                        const item = new ParentPaymentMethod(response.data, this.paymentMethods.length);
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
    deletePaymentMethod(postData: any, index: number): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-method-delete`, postData)
            .pipe(
                map(response => {

                    this.paymentMethods = this.paymentMethods.filter((item: any, idx: number) => idx !== index);

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
    setDefaultPaymentMethod(postData: any, index: number): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-default-payment-method`, postData)
            .pipe(
                map(response => {

                    if (this.paymentMethods[index]) {
                        _.forEach(this.paymentMethods, val => {
                            val.setStatus(false);
                            val.setUpdateStamp();
                        });
                        this.paymentMethods[index].setStatus(true);
                        this.onPaymentMethodsChanged.next([...this.paymentMethods]);
                    }

                    return response.message;
                }),
                shareReplay()
            );

    }

    deactivatePaymentMethod(postData: any, index: number): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-deactivate-payment-method`, postData)
            .pipe(
                map(response => {

                    if (this.paymentMethods[index]) {
                        this.paymentMethods[index].setStatus(false);
                        this.onPaymentMethodsChanged.next([...this.paymentMethods]);
                    }

                    return response.message;
                }),
                shareReplay()
            );

    }

    /**
     * Set default payment method
     * @param {string} id 
     * @param {Observable} 
     */
    syncParentPaymentMethod(postData: object): Observable<any> {

        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/sync-parent-payment-method`, postData)
            .pipe(
                map(response => {
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

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent_payment_ezidebit_reference`, {})
            .pipe(
                map(response => response.data.reference),
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
     * @param {string} publicKey
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

    getDependency(userId?: string): Observable<any> {

        const params = new HttpParams().set('user_id', userId);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-payment-method-dependency`, {params})
            .pipe(
                map(response => response.data),
                shareReplay()
            );

    }


}

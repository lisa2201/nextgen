import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { HttpParams, HttpClient } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';
import { map, shareReplay, take } from 'rxjs/operators';
import * as _ from 'lodash';
import { Child } from 'app/main/modules/child/child.model';
import { User } from 'app/main/modules/user/user.model';
import { FinanceAccountPayment } from '../../finance-account-payments/finance-account-payment.model';
import { BillingTerm } from '../model/finance.model';
import { AuthService } from 'app/shared/service/auth.service';
import { TitleCasePipe } from '@angular/common';

@Injectable()
export class FinanceService {

    disableButtonSubject: BehaviorSubject<boolean>;

    constructor(private _httpClient: HttpClient, private _authService: AuthService, private _titlecasePipe: TitleCasePipe) { 
        this.disableButtonSubject = new BehaviorSubject(false);
    }


    getFinancialAdjustmentChildrenList(rooms?: any, parent?: string, inactiveChildren?: boolean): Observable<any> {

        const obj = {
            room_ids: rooms ? rooms : [],
            parent_id: parent ? parent : null,
            inactive_children: inactiveChildren
        };

        const params = new HttpParams().set('data', JSON.stringify(obj));

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-adjustments-child-list`, { params })
            .pipe(
                map(response => {
                    return _.map(response.data, (item, index: number) => new Child(item, index));
                })
            );

    }

    addFinancialAdjustment(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-financial-adjustment`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    getRoomList(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-adjustments-room-list`)
            .pipe(
                map((response) => {
                    return response.data;
                })
            );

    }

    getAdjustmentListItems(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-adjustments-item-list`)
            .pipe(
                map(response => response.data)
            );

    }

    getStatementPreviewData(postData: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-statements-preview-data`, postData)
            .pipe(
                map((response) => {
                    return response.data;
                })
            );

    }

    parentStatementPdfDownload(postData: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-statements-pdf-preview`, postData)
            .pipe(
                map((response) => {
                    return response.data;
                })
            );

    }

    parentStatementEmail(postData: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-statements-email`, postData)
            .pipe(
                map((response) => {
                    return response.message;
                })
            );

    }

    getParentPaymentDetail(id: string): Observable<any> {

        const params = new HttpParams().set('id', id);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-account-payments-get`, { params })
            .pipe(
                map(response => {
                    return new FinanceAccountPayment(response.data);
                })
            );

    }

    getAccountBalance(parentId: string): Observable<any> {

        const params = new HttpParams().set('user_id', parentId);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-account-balance`, {params})
            .pipe(
                take(1),
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );

    }

    getActivePaymentMethod(parentId: string): Observable<any> {

        const params = new HttpParams().set('user_id', parentId);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/parent-active-payment-method`, {params})
            .pipe(
                take(1),
                map((response) => {
                    return response.data;
                }),
                shareReplay()
            );

    }

    /**
     * get parent list
     */
    getParentList(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-parent-list`)
            .pipe(
                map((response) => {
                    return response.data.map((val: any, idx: number) => new User(val, idx));
                })
            );

    }

    getSelectParentList(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-select-list-parents`)
            .pipe(
                map((response) => {
                    return response.data.map((val: any, idx: number) => new User(val, idx));
                })
            );

    }

    addManualPayment(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-add-manual-payment`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    addOneTimeScheduledPayment(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-one-time-scheduled-payment`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    getEntitlementGenerationDependency(userId: string | null): Observable<any> {

        const params = new HttpParams().set('user_id', userId);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-entitlement-statements-get-children`, {params})
            .pipe(
                map((response) => {
                    return response.data.map((val: any, idx: number) => new Child(val, idx));
                })
            );

    }

    generateStatementEntitlement(postData: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-entitlement-statements-pdf`, postData)
            .pipe(
                map((response) => {
                    return response.data;
                })
            );

    }

    refundPayment(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-account-payments-refund`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    retryPayment(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/financial-account-payments-retry`, postData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    getWaiveFeeUsers(filterData: any): Observable<any> {

        const params = new HttpParams()
                .set('filters', JSON.stringify(filterData));

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-parent-waive-fee-users`, {params})
            .pipe(
                shareReplay(),
                map((response) => {

                    const users = response.data && _.isArray(response.data) ? response.data.map((val: any, idx: number) => new User(val, idx)) : [];

                    return users;

                })
            );

    }

    getWaiveFeePreviewData(sendData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-parent-waive-fee-preview-data`, sendData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.data && _.isArray(response.data) ? response.data : [];
                })
            );

    }

    getWaiveFeeAdjust(sendData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-parent-waive-fee`, sendData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    bulkAutoChargeToggle(sendData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/finance-parent-bulk-auto-charge-update`, sendData)
            .pipe(
                shareReplay(),
                map((response) => {
                    return response.message;
                })
            );

    }

    getParentPaymentStatusDescription(status: string): string {
        
        let desc = '';

        switch (status) {
            case 'approved':
                desc = 'Approved';
                break;
            case 'pending':
                desc = 'Pending';
                break;
            case 'submitted':
                desc = 'Submitted';
                break;
            case 'completed':
                desc = 'Completed';
                break;
            case 'rejected_gateway':
                desc = 'Rejected by gateway';
                break;
            case 'rejected_user':
                desc = 'Rejected by user';
                break;
            case 'refund_success':
                desc = 'Refund Success';
                break;
            case 'refund_failed':
                desc = 'Refund Failed';
                break;
            case 'inactive':
                desc = 'Inactive';
                break;
            default:
                desc = '';
                break;

        }

        return desc;

    }

    getBillingTermList(): BillingTerm[] {
        return [
            {
                frequency: 'all',
                name: 'Current Balance',
                value: 'balance'
            },
            {
                frequency: 'weekly',
                name: 'Balance at end of billing week',
                value: 'one_week_advance'
            },
            {
                frequency: 'weekly',
                name: 'Balance at end of billing week + 1 week',
                value: 'two_week_advance'
            },
            {
                frequency: 'weekly',
                name: 'Balance at end of billing week + 2 weeks',
                value: 'three_week_advance'
            },
            {
                frequency: 'weekly',
                name: 'Balance at end of billing week + 3 weeks',
                value: 'four_week_advance'
            },
            {
                frequency: 'fortnightly',
                name: 'Balance at end of billing week + 1 week',
                value: 'two_week_advance'
            },
            {
                frequency: 'fortnightly',
                name: 'Balance at end of billing week + 2 weeks',
                value: 'three_week_advance'
            },
            {
                frequency: 'fortnightly',
                name: 'Balance at end of billing week + 3 weeks',
                value: 'four_week_advance'
            },
            {
                frequency: 'fortnightly',
                name: 'Balance at end of billing week + 4 weeks',
                value: 'five_week_advance'
            },
            {
                frequency: 'monthly',
                name: 'Balance at end of billing month (4 weeks)',
                value: 'one_month_advance'
            },
            {
                frequency: 'monthly',
                name: 'Balance at end of billing month + 1 month (8 weeks)',
                value: 'two_month_advance'
            },
            {
                frequency: 'monthly',
                name: 'Balance at end of billing month + 2 months (12 weeks)',
                value: 'three_month_advance'
            },
        ];
    }

    getBillingTermDescriptionMap(): any {

        const billingTermMap = {};

        _.forEach(this.getBillingTermList(), (val) => {
            billingTermMap[val.value] = val.name;
        });

        return billingTermMap;
    }

    getPaymentFrequencies(): {name: string, value: string}[] {

        const paymentFrequencies = [
            {
                name: 'Weekly',
                value: 'weekly'
            },
            {
                name: 'Fortnightly',
                value: 'fortnightly'
            },
            {
                name: 'Monthly - every 4 weeks',
                value: 'monthly'
            }
        ];

        if (!this._authService.canAccess(['AC0'], 'N22') && this._authService.canAccess(['AC0'], 'N61')) {
            paymentFrequencies.push({
                name: 'Custom Plan',
                value: 'custom'
            });
        }

        return paymentFrequencies;

    }

    handleBookingTransactionButton(): void {

        this.disableButtonSubject.next(true);

        setTimeout(() => {
            this.disableButtonSubject.next(false);
        }, 10000);

    }

    getTransactionTypeMap(): any {

        const transactionTypeMap = {
            fee: 'Booking Fee',
            subsidy_payment: 'CCS Subsidy Payment',
            parent_payment: 'Parent Payment',
            parent_payment_refund: 'Parent Payment Refund',
            adjustment: 'Adjustment',
            account_balance: 'Balance Adjustment',
            subsidy_estimate: 'CCS Estimate',
            ccs_payment: 'Weekly Actual CCS Payment',
            accs_payment: 'Weekly Actual ACCS Payment'
        };

        return transactionTypeMap;

    }

    getManualPaymentMapDesc(detail: FinanceAccountPayment, reference: boolean = false): string {

        let method = '';

        if (detail.paymentMethod) {

            if (reference) {

                if (detail.paymentMethod.type === 'bpay') {
                
                    method =  `BPAY CRN: ${detail.paymentMethod.reference}`;
    
                } else {
                    method = detail.paymentMethod.instrument;
                }

            } else {

                if (detail?.paymentMethod?.type) {
                    return this._titlecasePipe.transform(detail?.paymentMethod?.type);
                }

            }

        } else {

            if (detail.paymentGenerationType === 'manual') {

                if (detail.manualPaymentType === 'cash') {
                    method = 'Manual Payment - Cash';
                } else if (detail.manualPaymentType === 'cheque') {
                    method = 'Manual Payment - Cheque';
                } else if (detail.manualPaymentType === 'direct_debit' || detail.manualPaymentType === 'direct_deposit') {
                    method = 'Manual Payment - Direct Deposit';
                } else if (detail.manualPaymentType === 'fpos') {
                    method = 'Manual Payment - EFTPOS';
                } else  {
                    method = 'Manual Payment';
                }
                
            }
            
        }

        return method;

    }

}

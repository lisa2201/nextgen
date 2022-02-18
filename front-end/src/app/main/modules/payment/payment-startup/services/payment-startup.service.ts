import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { AppConst } from 'app/shared/AppConst';
import { shareReplay, map } from 'rxjs/operators';

@Injectable()
export class PaymentStartupService {

    constructor(
        private _httpClient: HttpClient
    ) {}

    /**
     * Complete payment information
     * @param {any} postData
     * @returns {Observable}
     */
    completePaymentInfo(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/subscribe_payment_info`, postData)
            .pipe(
                map((response) => {

                    return response.message;

                }),
                shareReplay(),
            );

    }

}

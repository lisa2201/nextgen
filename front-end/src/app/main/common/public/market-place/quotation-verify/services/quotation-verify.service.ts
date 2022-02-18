import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { AppConst } from '../../../../../../shared/AppConst';
import { __param } from 'tslib';

@Injectable({
  providedIn: 'root'
})
export class QuotationVerifyService {

  /**
   * Constructor
   * @param {HttpClient} _http 
   */
  constructor(
    private _http: HttpClient
  ) { }


  /**
    * Verify Email
    * @param {any} postData 
    */
  verifyEmail(postData: any): Observable<any> {
    return this._http.post<any>(`${AppConst.apiBaseUrl}/quotation_verify_email`, postData)
      .pipe(
        map(response => response.data)
      );
  }



}

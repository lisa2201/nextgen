import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { shareReplay, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})

export class PincodeService {
  onPincodetabShow: BehaviorSubject<any>;

  constructor(
    private _httpClient: HttpClient    
  ) {
    this.onPincodetabShow = new BehaviorSubject([]);
   }
    
  /**
   * Resolver
   *
   * @param {ActivatedRouteSnapshot} route
   * @param {RouterStateSnapshot} state
   * @returns {Observable<any> | Promise<any> | any}
   */
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {
   
    return new Promise((resolve, reject) => {

      Promise.all([        
        this.getPincode()
      ])
      .then(([list]: [any]) => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });

    });

  }

  getPincode(): Promise<any> {

    return new Promise((resolve, reject) => {

        return this._httpClient
        .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-pincode`)
        .pipe(
            map((response) => {

                return {
                    items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : response.data,
                };

            }),
            shareReplay()
        )
        .subscribe(
            (response: any) => {
                this.onPincodetabShow.next(response);
                resolve();
            },
            reject
        );
    });
  }

  updatePincode(postData: any): Observable<any> {

    return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-pincode`, postData)
      .pipe(

        map((response) => {

          return response;

        })
      );

  }

}
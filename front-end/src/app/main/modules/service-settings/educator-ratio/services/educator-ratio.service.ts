import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import * as _ from 'lodash';
import { AppConst } from 'app/shared/AppConst';
import { shareReplay, map } from 'rxjs/operators';
import {AuthService} from '../../../../../shared/service/auth.service';

@Injectable({
  providedIn: 'root'
})

export class EducatorRatioService {
    onEducatorRatiotabShow : BehaviorSubject<any>;
  constructor(
    private _httpClient: HttpClient
  ) {
    this.onEducatorRatiotabShow = new BehaviorSubject([]);
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
        this.getEducatorRatios()
      ])
      .then(([list]: [any]) => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });

    });

  }

    getEducatorRatios(): Promise<any> {

    return new Promise((resolve, reject) => {

        return this._httpClient
        .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-educator-ratio`)
        .pipe(
            map((response) => {

                return {
                    items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : response.data,
                    states: response.states,
                    branch: response.branch
                };

            }),
            shareReplay()
        )
        .subscribe(
            (response: any) => {
                this.onEducatorRatiotabShow.next(response);
                resolve();
            },
            reject
        );
    });
  }

    updateState(postData: any): Observable<any> {

    return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/set-state`, postData)
      .pipe(

        map((response) => {

          return response;

        })
      );

  }

}
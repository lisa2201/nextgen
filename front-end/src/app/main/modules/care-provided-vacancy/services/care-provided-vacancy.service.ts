import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AppConst } from 'app/shared/AppConst';
import { map, shareReplay, finalize } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class CareProvidedVacancyService {

  onWaitlistChanged: BehaviorSubject<any>;
  onTableLoaderChanged: any;
  
  constructor(
    private _httpClient: HttpClient
    
  ) {
    this.onWaitlistChanged = new BehaviorSubject([]);
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
        this.getvacancies()
      ])
      .then(([list]: [any]) => {

        // this.setEvents();

        resolve();
      })
      .catch(error => {
        reject(error);
      });

    });
  }

  getvacancies(): Promise<any> {

    return new Promise((resolve, reject) => {

        return this._httpClient
        .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-care-provided-vacancy`)
        .pipe(
            map((response) => {

                return {
                    items: (_.keys(response).length < 1 || (response.data && response.data.length < 1)) ? [] : response.data,
                };

            }),
            // finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
            shareReplay()
        )
        .subscribe(
            (response: any) => {
                this.onWaitlistChanged.next(response);

                resolve();
            },
            reject
        );
    });
  }

  storeCareProvidedVacancy(postData: any): Observable<any> {

    return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/create-care-provided-vacancy`, postData)
      .pipe(

        map((response) => {

          return response;

        })
      );

}

}


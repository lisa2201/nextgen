import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppConst } from 'app/shared/AppConst';
import { shareReplay, map, take, tap } from 'rxjs/operators';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import * as _ from 'lodash';

@Injectable({ providedIn: 'root' })

export class ServiceSetupService {
   
  
    constructor(
        private _httpClient: HttpClient

    ) {

    }

    services: any;

    onServiceChanged = new BehaviorSubject<any>([]);


    getServices(): Observable<any> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-list-service-setup`)
            .pipe(
                map(response => response.data)
            );


    }

    getService(id: string): Observable<any> {

        const params = new HttpParams().set('index', id);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-service`, { params: params })
            .pipe(
                map(response => response)
            );

    }


    updateaddress(data: object): Observable<any>{

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/service-setup-edit-address`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );




    }

    changeServiceCredentials(data: object): Observable<any>{

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/service-credentials`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );




    }

    updatecontact(data: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/service-setup-edit-financial`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }

    updatefinancial(data: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/service-setup-edit-financial`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }

    updateBusinessName(data: object): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/service-setup-edit-name`, data)
            .pipe(
                take(1),
                map((response) => response.message),
                shareReplay()
            );

    }

    updateAccsPErcentage(data: any): Observable<any> {

        const params = new HttpParams().set('queryDate', data.queryDate).set('serviceID', data.serviceID);
        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-accs-percentage`, { params: params })
            .pipe(
                take(1),
                map((response) => response),
                shareReplay()
            );

    }

    pingCCMS(data: any): Observable<any> {
        const params = new HttpParams().set('serviceID', data);
        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/ping-ccms`, { params: params})
            .pipe(
                take(1),
                map((response) => response),
                shareReplay()
            );
    }

    addService(data: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-service`, data)
            .pipe(
                map(response => response.message)
            );

    }

    

}

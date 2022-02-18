import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {AppConst} from '../../../../../shared/AppConst';
import {map, shareReplay, takeUntil} from 'rxjs/operators';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {EmergencyContact} from '../emergency.model';

@Injectable({
  providedIn: 'root'
})
export class EmergencyContactService implements Resolve<any> {

    emergency: EmergencyContact[];
    onEmergencyChanged: BehaviorSubject<any>;
    onEmergencyChangedUpdated: Subject<any>;

    private _unsubscribeAll: Subject<any>;
  constructor(
      private _httpClient: HttpClient
  ) {
      this.onEmergencyChanged = new BehaviorSubject([]);
      this.onEmergencyChangedUpdated = new Subject();
      this._unsubscribeAll = new Subject();
  }


    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {

        return new Promise((resolve, reject) => {
            Promise.all([
                this.getEmergency()
            ])
                .then(([emergency]: [any]) => {
                    // this.onEmergencyChangedUpdated
                    //     .pipe(takeUntil(this._unsubscribeAll))
                    //     .subscribe((res: any) => {
                    //          this.getEmergency();
                    //     });
                    resolve();
                    // return this.emergency;
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    updateEmergency(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-emergency-contact`, postData)
            .pipe(

                map((response) => {
                    this.getEmergency();
                    // setTimeout(() => this.onEmergencyChangedUpdated.next([...this.emergency]), 350);
                    return response.message;

                }),
                shareReplay()
            );

    }

    addEmergency(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-emergency-contact`, postData)
            .pipe(

                map((response) => {
                    this.getEmergency();
                    // setTimeout(() => this.onEmergencyChangedUpdated.next([...this.emergency]), 350);
                    return response.message;

                }),
                shareReplay()
            );

    }

    getEmergency(): Promise<any>{
        return new Promise((resolve, reject) => {

            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-emergency-for-parent`)
                .pipe(
                    map(response => {
                        this.emergency = response.data.map(i => new EmergencyContact(i));

                        return this.emergency;
                    }),
                    shareReplay()
                ).subscribe(
                (response: any) => {
                    this.onEmergencyChanged.next(response);
                    resolve();
                },
                reject
            );
        });

    }

    deleteEmergency(id: any, childId: any): Observable<any>{
        const params = new HttpParams().set('user_id', id).set('child_id', childId);
        return this._httpClient.delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-emergency-contact`, {params})
            .pipe(

                map((response) => {
                    this.getEmergency();
                    // setTimeout(() => this.onEmergencyChangedUpdated.next([...this.emergency]), 350);
                    return response.message;

                }),
                shareReplay()
            );
    }
}
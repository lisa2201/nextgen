import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {AppConst} from '../../../../../shared/AppConst';
import {first, map, shareReplay, takeUntil} from 'rxjs/operators';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {EmergencyContact} from '../emergency.model';
import {ChildrenService} from '../../services/children.service';
import {Child} from '../../child.model';

@Injectable({
  providedIn: 'root'
})
export class EmergencyContactService implements Resolve<any> {
    routeParams: any;
    emergency: EmergencyContact[];
    onEmergencyChanged: BehaviorSubject<any>;
    onEmergencyChangedUpdated: Subject<any>;
    onChildChanged: BehaviorSubject<any>;


    private _unsubscribeAll: Subject<any>;
    private child: Child;

  constructor(
      private _httpClient: HttpClient,
      private _childrenService: ChildrenService,
  ) {
      this.onEmergencyChanged = new BehaviorSubject([]);
      this.onEmergencyChangedUpdated = new Subject();
      this._unsubscribeAll = new Subject();
      this.onChildChanged = new BehaviorSubject([]);
  }


    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {

        this.routeParams = route.params;
        return new Promise<void>((resolve, reject) => {
            Promise.all([
                this.getEmergency(this.routeParams.id),
                this.getChild(this.routeParams.id),
            ])
                .then(([emergency, child]: [any, any]) => {
                   
                    resolve();
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

                    this.getEmergency(this.routeParams.id);
                    // setTimeout(() => this.onEmergencyChangedUpdated.next([...this.emergency]), 350);
                    // return response.message;

                }),
                shareReplay()
            );

    }

    addEmergency(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/add-emergency-contact`, postData)
            .pipe(

                map((response) => {

                    // return response.message;

                    this.getEmergency(this.routeParams.id);

                }),
                shareReplay()
            );

    }

    getEmergency(child: string): Promise<any>{
        return new Promise((resolve, reject) => {
            const params = new HttpParams().set('index', child);
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-emergency`, { params })
                .pipe(
                    map(response => {
                        this.emergency = response.data.map(i => new EmergencyContact(i))
                    
                        return this.emergency;
                    }),
                    shareReplay()
                ).subscribe(
                (response: any) => {
                    // this.rooms=response.data.map(i => new Room(i));
                    this.onEmergencyChanged.next(response);
                    resolve();
                },
                reject
            );
        });
       // return
    }

    deleteEmergency(id: any): Observable<any>{

        const params = new HttpParams().set('user_id', id).set('child_id', this.routeParams.id);
        return this._httpClient.delete<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-emergency-contact`, {params})
            .pipe(

                map((response) => {
                    // setTimeout(() => this.onEmergencyChangedUpdated.next([...this.emergency]), 350);
                    this.getEmergency(this.routeParams.id);
                    return response.message;

                }),
                shareReplay()
            );
    }

    /**
     * Get child item
     *
     * @returns {Promise<any>}
     */
    getChild(index: string): Promise<any>
    {
        
        return new Promise((resolve, reject) =>
        {
            this._childrenService
                .getChildShortData(index)
                .pipe(first())
                .subscribe(
                    (response) =>
                    {
                        this.child = response;

                        this.onChildChanged.next(this.child);

                        resolve();
                    },
                    reject
                );
        });
    }

}
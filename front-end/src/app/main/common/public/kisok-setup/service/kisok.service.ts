import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, forkJoin, BehaviorSubject, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { AppConst } from '../../../../../shared/AppConst';
import * as _ from 'lodash';

import { finalize, map, shareReplay } from 'rxjs/operators';
import { CommonService } from 'app/shared/service/common.service';
import { AuthService } from 'app/shared/service/auth.service';
import { Branch } from 'app/main/modules/branch/branch.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { User } from 'app/main/modules/user/user.model';
import { Child } from 'app/main/modules/child/child.model';

@Injectable({
    providedIn: 'root'
})
export class KisokService implements Resolve<Promise<any>> {

    public addonId;
    routeParams: any;
    onBranchChanged: BehaviorSubject<any>;
    onUserChanged: BehaviorSubject<any>;
    onChildChanged: BehaviorSubject<any>;
    onChildMissedChanged: BehaviorSubject<any>;
    onTableLoaderChanged: Subject<any>;
    onDestroyChanged:  Subject<any>;
    
    user: User;
    child: any;
    token: string;
    rerefreshToken: string;

    /**
     * Constructor
     * @param {CommonService} _commonService 
     * @param {Router} _router 
     * @param {MarketPlaceService} _marketplaceService 
     */
    constructor(
        private _authService: AuthService,
        private _commonService: CommonService,
        private _router: Router,
        private _httpClient: HttpClient,
    ) {

        this.onBranchChanged = new BehaviorSubject([]);
        this.onUserChanged = new BehaviorSubject([]);
        this.onChildChanged = new BehaviorSubject([]);
        this.onChildMissedChanged = new BehaviorSubject([]);
        this.onTableLoaderChanged = new Subject();
        this.onDestroyChanged = new Subject();

        this.token = null;
        this.rerefreshToken = null;
     }


    /**
     * 
     * @param {ActivatedRouteSnapshot} route 
     * @param {RouterStateSnapshot} state 
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {

        console.log(this._authService._domain);
        this._authService.clearAuthUser();
        
        this._authService.getClientInformation()
            .subscribe(response => {

                this.onBranchChanged.next([response.data])
            })


        
        return of(null);

    }

    login(data: object): Observable<any>
    {
        this.onTableLoaderChanged.next(true);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/device-pincode-login`, data)
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.user = new User(response.data.user);
                        this.token = response.data.access_token;
                        this.rerefreshToken = response.data.refresh_token;

                        this._authService.updateTokens(
                            {"access_token":this.token,
                            "refresh_token":this.rerefreshToken,
                            "__iED":false})

                        
                        console.log(this.user);

                        setTimeout(() => {
                            this.onUserChanged.next({
                                user: this.user,
                                token:this.token
                            })
                        }, 350);

                        
                        this.getChildData()
                        .subscribe(res=>{
                            let childIds = [];
                            for(let child of res){
                                childIds.push(child.chid_id)
                            }
                            this.getMissed(childIds)
                            .subscribe()

                            setTimeout(() => this.onTableLoaderChanged.next(false), 1000);
                        });
                        
                    }

                    return response.message;
                }),
                shareReplay()
            );
    }

    getChildData(): Observable<any>{

        const params = new HttpParams().set('is_web', 'true');

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/kiosk-api/device-get-child-data`, {params})
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length > 0) {
                        
                        console.log('responsedata', response.data.childList);
                        
                        this.child = response.data.childList;

                        setTimeout(() => {
                            this.onChildChanged.next([...this.child])
                        }, 350);
                    }

                    return response.data.childList;
                }),
                shareReplay()
            );
    }


    getMissed(ids): Observable<any>
    {
        console.log(ids);
        
        const params = new HttpParams().set('child_ids', JSON.stringify(ids));

        console.log(params);
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/kiosk-api/device-get-missed-attendance`, {params})
            .pipe(
                map(response => {
                    setTimeout(() => {
                        this.onChildMissedChanged.next([...response.data.attendances]);
                    }, 350);
                    
                    return response;
                }),
                shareReplay()
            );
    }

    getClientByMobile(mobile: string):Observable<any>{

        this.onTableLoaderChanged.next(true);

        const params = new HttpParams().set('mobile', mobile);
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/get-client-by-mobile`, {params})
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.user = new User(response.data);
                        
                        setTimeout(() => {
                            this.onUserChanged.next({
                                user: this.user,
                                token: null
                            })
                        }, 350);
                    }

                    return response;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
        
    }

    saveChangedPinCode(mobile: string, pincode: string):Observable<any>{

        this.onTableLoaderChanged.next(true);

        const params = new HttpParams().set('mobile', mobile).set('pincode', pincode);
        
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/device-create-parent-pincode`, {params})
            .pipe(
                map(response => 
                {
                    if (response.data && _.keys(response.data).length > 0)
                    {
                        this.user = new User(response.data);
                        
                        setTimeout(() => {
                            this.onUserChanged.next({
                                user: this.user,
                                token: null
                            })
                        }, 350);
                    }

                    return response;
                }),
                finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                shareReplay()
            );
        
    }

    
    createAttendance(data: object, isDestroy: boolean):Observable<any>{

        this.onTableLoaderChanged.next(true);

        this.onDestroyChanged.next(isDestroy);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/kiosk-api/device-attendance-create`, data)
            .pipe(
                map(response => 
                {
                    console.log(response);
                    if (response.data && _.keys(response.data).length > 0)
                    {
                       this.getChildData()
                       .subscribe();
                    }

                    return response.message;
                }),
                finalize(() => setTimeout(() => {
                    this.onTableLoaderChanged.next(false)
                    }, 200)),
                shareReplay()
            );
        
    }

    completeMissedAttendance(data: object, isDestroy: boolean):Observable<any>{

        this.onDestroyChanged.next(isDestroy);
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/kiosk-api/device-complete-missed-attendance`, data)
            .pipe(
                map(response => 
                {
                    let missedData = [];

                    if (response.data && _.keys(response.data).length > 0)
                    {
                        let childIds = [];
                        for( let child of this.child){

                            childIds.push(child.chid_id)
                        }
                        this.getMissed(childIds)
                        .subscribe(response => {
                            missedData = response.data.attendances;
                        })
                    }

                    return missedData;
                }),
                finalize(() => setTimeout(() => {
                    
                    }, 200)),
                shareReplay()
            );
        
    }



}

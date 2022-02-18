import { Injectable, Provider } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AppConst } from 'app/shared/AppConst';
import { map } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ProviderViewEditService implements Resolve<any> {
    provider: any;
    onProviderChanged: BehaviorSubject<any>;


    /**
     * Constructor
     *
     * @param {HttpClient} _httpClient
     * @param {NGXLogger} _logger
     */


    constructor(
        private _httpClient: HttpClient
    ) {
        this.onProviderChanged = new BehaviorSubject([]);
    }


    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<any>{

        const id = route.params.id;
        const params = new HttpParams().set('index', id);

        return new Promise((resolve, reject) => {

            this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-provider`, { params: params })
                .pipe(
                    map(response => response.data)
                )
                .subscribe((response) => {
                    this.provider = response;
                    this.onProviderChanged.next({ ...this.provider });
                    resolve();
                });

        });



    }


}

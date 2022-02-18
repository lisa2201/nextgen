import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppConst } from 'app/shared/AppConst';
import { Observable } from 'rxjs';
import { map, shareReplay, take } from 'rxjs/operators';
import { CcsSetup } from '../ccs-setup/ccs-setup.model';
import { ProviderSetup } from './provider-setup/models/provider-setup.model';

@Injectable()
export class AccountManagerService {

    constructor(private _httpClient: HttpClient) {}

    getCcsSetups(): Observable<CcsSetup[]> {
        
        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-ccs`)
            .pipe(
                take(1),
                map((response) =>  {

                    if (response.data) {
                        return response.data.map((i:any, idx: number) => new CcsSetup(i, idx));
                    } else {
                        return [];
                    }

                }),
                shareReplay()
            );

    }

    getCcsProviders(): Observable<ProviderSetup[]> {

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-ccs-providers`)
            .pipe(
                take(1),
                map((response) =>  {

                    if (response.data) {
                        return response.data.map((i:any, idx: number) => new ProviderSetup(i));
                    } else {
                        return [];
                    }

                }),
                shareReplay()
            );

    }

}
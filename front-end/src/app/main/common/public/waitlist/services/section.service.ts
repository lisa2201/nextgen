import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {AppConst} from 'app/shared/AppConst';
import {map, shareReplay, take} from 'rxjs/operators';
import {AuthService} from 'app/shared/service/auth.service';
import {Branch} from 'app/main/modules/branch/branch.model';

import * as _ from 'lodash';

const httpOptions = {
    headers: new HttpHeaders({
        'Content-Type': 'application/json'
    })
};

@Injectable()
export class SectionService {

    constructor(private _httpClient: HttpClient, private _auth: AuthService) {

    }

    enrolmentDynamicFields(branchId?: string, formType?: string): Observable<any> {

        const post = {
            'branch_id': branchId || branchId === '' ? branchId : this._auth.getClient().id,
            'form': formType
        }

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/enrolment_format_creater_public`, post);
    }

    getBranches(orgId: string): Observable<any> {

        const params = new HttpParams().set('orgId', orgId);

        return this._httpClient.get<any>(`${AppConst.apiBaseUrl}/get-enrolment-form-branches`, {params})
            .pipe(
                take(1),
                map((response) => {
                    return _.map(response.data, (val: any, idx: number) => new Branch(val, idx));
                }),
                shareReplay()
            );

    }
}

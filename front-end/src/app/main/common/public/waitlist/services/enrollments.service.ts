import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, shareReplay, take} from 'rxjs/operators';
import * as _ from 'lodash';
import {HttpClient, HttpParams} from '@angular/common/http';
import {AppConst} from 'app/shared/AppConst';
import {AuthService} from 'app/shared/service/auth.service';

@Injectable()
export class EnrollmentsService {

    branchDetails: any;
    emergencyContactsSettings = new BehaviorSubject([]);

    constructor(
        private _httpClient: HttpClient,
        private _auth: AuthService,
    ) {
        // this.branchDetails = this._auth.getClient();
    }

    storeWaitListChild(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/child-wait-list-store`, postData)
            .pipe(
                map((response) => {

                    return response;

                }),
                shareReplay()
            );

    }

    storeEnquiry(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/child-enquiry-store`, postData)
            .pipe(
                map((response) => {

                    return response;

                }), shareReplay()
            );

    }

    enrollChild(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/enroll-child`, postData)
            .pipe(
                map((response) => {

                    return response.message;

                }), shareReplay()
            );

    }

    enrollChildMasterData(postData: any): Observable<any> {
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/enroll_child_save_public`, postData)
            .pipe(
                map((response) => {

                    return response;

                }), shareReplay()
            );

    }

    /**
     * Get enrollment details
     *
     * @returns {Observable<any>}
     */
    getEnrolInfo(index: any, form: string): Observable<any> {

        const params = new HttpParams().set('id', index).set('form', form);

        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-enrollment-info`, {params})
            .pipe(
                map(response => {
                        return (response.data)
                    }
                ),
                shareReplay()
            );

    }

    /**
     * get Allergy Typew
     *
     * @returns {Observable<any>}
     */
    getAllergyTypes(branchId: string): Observable<any> {
        const params = new HttpParams().set('branch_id', branchId);
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-child-allergy-types`, {params})
            .pipe(
                map(response => {
                    if (response.data && _.keys(response.data).length < 1) {
                        return {};
                    } else {
                        return {
                            allergyTypes: response.data
                        };
                    }
                }),
                shareReplay()
            );
    }

    storeChildEnquiry(postData: any): Observable<any> {

        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/child-enquiry-store`, postData)
            .pipe(
                map((response) => {

                    return response;

                }),
                shareReplay()
            );

    }

    public setEmergencyContactsSettings(data: any): void {
        this.emergencyContactsSettings.next(data);
    }

    public getEmergencyContactsSettings(): Observable<any> {
        return this.emergencyContactsSettings.asObservable();
    }

}



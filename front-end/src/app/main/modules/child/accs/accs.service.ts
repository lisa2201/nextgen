import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {BehaviorSubject, forkJoin, Observable, Subject} from 'rxjs';
import {finalize, map, shareReplay, takeUntil} from 'rxjs/operators';
import {HttpClient, HttpParams} from '@angular/common/http';
import {AppConst} from '../../../../shared/AppConst';
import {CertificateOrDetermination} from './certificate-or-determination.model';
import {AuthService} from '../../../../shared/service/auth.service';
import { ChildService } from '../services/child.service';

export interface SelectValues {
    name: string;
    value: string;
}

@Injectable()
export class AccsService {

    onACCSChanged: BehaviorSubject<any>;
    onACCSChangedUpdated: Subject<any>;
    onTableLoaderChanged: Subject<any>;
    private _unsubscribeAll: Subject<any>;
    certificateOrDetermination: CertificateOrDetermination[];
    singleCertificate: CertificateOrDetermination;
    singleDetermination: CertificateOrDetermination;
    ApiData: any;
    branchDetails: any;

    constructor(
        private _httpClient: HttpClient,
        private _auth: AuthService,
        private _childService: ChildService
    ) {
        this._unsubscribeAll = new Subject();
        this.onACCSChanged = new BehaviorSubject([]);
        this.onACCSChangedUpdated = new Subject();
        this.onTableLoaderChanged = new Subject();
    }


    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {

        const id = route.paramMap.get('id');

        return forkJoin([
            this.getDetermination(id),
            this._childService.getChild(id)
        ]);

    }

    getDetermination(child: string): Promise<any>{
      // set table loader
        this.onTableLoaderChanged.next(true);

        this.branchDetails = this._auth.getClient();
        return new Promise((resolve, reject) => {
            const params = new HttpParams().set('index', child).set('branch', this.branchDetails.id);
            this._httpClient
                .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-determination`, { params })
                .pipe(
                    map(response => {
                        this.certificateOrDetermination = response.data.map(i => new CertificateOrDetermination(i));
                        this.ApiData = response.ApiData;
                        return {
                            items: this.certificateOrDetermination,
                            apiData: this.ApiData
                        };
                    }),
                    shareReplay(),
                    finalize(() => setTimeout(() => this.onTableLoaderChanged.next(false), 200)),
                ).subscribe(
                (response: any) => {
                    // this.rooms=response.data.map(i => new Room(i));
                    this.onACCSChanged.next(response);
                    resolve();
                },
                reject
            );
        });
        // return
    }

    getCertificateByID(id: string): Observable<any> {

        this.branchDetails = this._auth.getClient();

        const params = new HttpParams().set('id', id).set('branch', this.branchDetails.id);
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-certificate-by-id`, { params })
            .pipe(
                map(response => {
                    this.singleCertificate = response.data;

                    return {
                        item: this.singleCertificate,
                    };
                }),
                shareReplay()
            );

    }

    getDeterminationByID(id: string): Observable<any> {

        this.branchDetails = this._auth.getClient();

        const params = new HttpParams().set('id', id).set('branch', this.branchDetails.id);
        return this._httpClient
            .get<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/get-determination-by-id`, { params })
            .pipe(
                map(response => {
                    this.singleDetermination = response.data;

                    return {
                        item: this.singleDetermination,
                    };
                }),
                shareReplay()
            );
    }

    newDetermination(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/new-determination`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    newCertificate(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/new-certificate`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    updateCertificate(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-certificate`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    updateDetermination(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-determination`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    saveStateTerritory(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-certificate-state-territory`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    childNoLongerAtRisk(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/advice-child-no-longer-at-risk`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    cancelCertificate(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/cancel-certificate`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    deleteCertificate(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/delete-certificate`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    updateDocuments(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-certificate-documents`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }
    
    updateDocument204k(postData: any): Observable<any>{
        return this._httpClient.post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/update-state-territory-document`, postData)
            .pipe(

                map((response) => {
                    setTimeout(() => this.onACCSChangedUpdated.next([...this.certificateOrDetermination]), 350);
                    return response.message;
                    shareReplay();
                })
            );
    }

    getExceptionalCircumstanceValues(): SelectValues[] {

        return [
            {
                name: 'Delay in evidence beyond Provider’s control',
                value: 'BEYOND',
            },
            {
                name: 'Other',
                value: 'OTHER',
            }
        ];


    }

    getExtensionReasonValues(): SelectValues[] {

        return [
            {
                name: 'The child is on long term protection order',
                value: 'LONGPO',
            },
            {
                name: 'The child is in formal foster care/kinship care',
                value: 'FOSKIN',
            }
        ];


    }
}

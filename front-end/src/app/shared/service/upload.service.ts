import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { NGXLogger } from 'ngx-logger';

import { AppConst } from '../AppConst';

@Injectable({
    providedIn: 'root'
})
export class UploadService {

    ignoreLoadingHeaders: HttpHeaders;

    /**
     * Constructor
     * 
     * @param {NGXLogger} _logger
     * @param {HttpClient} _httpClient
     */
    constructor(
        private _logger: NGXLogger,
        private _httpClient: HttpClient,
    )
    {
        // Set defaults
        this.ignoreLoadingHeaders = new HttpHeaders({ 'ignoreProgressBar': '' });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    uploadDocuments(data: any): Observable<any>
    {
        return this._httpClient
            .post<any>(`${AppConst.apiBaseUrl}/${AppConst.urlPrefix.APP}/upload-doc`, data, { headers: this.ignoreLoadingHeaders })
            .pipe(
                map(response => response),
                shareReplay()
            );
    }



}

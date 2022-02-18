import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { NzUploadXHRArgs } from 'ng-zorro-antd';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AppConst } from 'app/shared/AppConst';

@Injectable()
export class S3UploadService {

    constructor(
        private httpClient: HttpClient,
        private httpBackend: HttpBackend
    ) {}

    /**
     * Get Presigned URL
     * @param {string} name
     * @param {string} bucket
     * @returns {Observable}
     */
    getPresignedUrl(name: string, bucket: string): Observable<any> {

        const params = new HttpParams()
            .set('name', name)
            .set('bucket', bucket);

        return this.httpClient.get<any>(`${AppConst.apiBaseUrl}/s3-signed-url`, { params: params })
            .pipe(
                map((response: any) => response.data)
            );
    }

    /**
     * Upload to S3
     * @param {NzUploadXHRArgs} uploadFile
     * @param {string} signedUrl
     * @returns {Observable}
     */
    uploadToS3(uploadFile: NzUploadXHRArgs, signedUrl: string): Observable<any> {

        // New HTTP Client to bypass interceptors
        const newhttpclient = new HttpClient(this.httpBackend);

        return newhttpclient.put(signedUrl, uploadFile.file, { reportProgress: true, observe: 'events' });
    }

}

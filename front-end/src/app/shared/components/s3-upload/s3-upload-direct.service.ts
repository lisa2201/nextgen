import {HttpBackend, HttpClient, HttpEvent, HttpEventType, HttpParams} from '@angular/common/http';
import {EventEmitter, Injectable, Output} from '@angular/core';

import {NzUploadFile, NzUploadXHRArgs} from 'ng-zorro-antd';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {AppConst} from 'app/shared/AppConst';
import * as _ from 'lodash';
import * as uuid from 'uuid';
import {FileHashMap, FileListItem} from './s3-upload.model';


@Injectable()

export class S3UploadDirectService {
    path: string = null;
    bucket = AppConst.s3Buckets.KINDERM8_NEXTGEN;
    fileHashMap: FileHashMap[];
    @Output() uploadedFileChange: EventEmitter<FileHashMap[]>;
    file = new BehaviorSubject([]);
    changeFile = this.file.asObservable();

    constructor(
        private httpClient: HttpClient,
        private httpBackend: HttpBackend
    ) {
        this.fileHashMap = [];
        this.uploadedFileChange = new EventEmitter();
    }

    /**
     * Get Presigned URL
     * @param {string} name
     * @param {string} bucket
     * @returns {Observable}
     */
    getPresignedUrl(fileName: string, path: string): Observable<any> {
        this.path = path;
        const name = this.getS3Key(fileName);
        const params = new HttpParams()
            .set('name', name)
            .set('bucket', this.bucket);

        return this.httpClient.get<any>(`${AppConst.apiBaseUrl}/s3-signed-url`, {params: params})
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
    uploadToS3(uploadFile: File, signedUrl: string): Observable<any> {

        // New HTTP Client to bypass interceptors
        const newhttpclient = new HttpClient(this.httpBackend);

        return newhttpclient.put(signedUrl, uploadFile, {
            reportProgress: true,
            observe: 'events',
            responseType: 'json'
        });

    }

    getS3Key(fileName): string {

        let key = `${uuid.v4()}-${fileName}`;
        this.fileHashMap.push({key: key, uid: fileName});
        this.file.next(this.fileHashMap.length > 0 ? this.fileHashMap : null);
        if (this.path) {
            key = _.last(this.path) === '/' ? `${this.path}${key}` : `${this.path}/${key}`;
        }

        return key;

    }

    attachmentSend(fileName, file, path): Observable<any> {
        return this.getPresignedUrl(fileName, path)
            .pipe(
                switchMap((presignedUrl: string): Observable<any> => {
                    return this.uploadToS3(file, presignedUrl);
                })
            )
    }
}

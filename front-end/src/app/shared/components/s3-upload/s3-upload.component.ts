import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { HttpEvent, HttpEventType } from '@angular/common/http';

import { Observable, Subject, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd';
import * as _ from 'lodash';
import * as uuid from 'uuid';

import { S3UploadService } from './s3-upload.service';
import { UploadListConfig, FileHashMap, FileListItem } from './s3-upload.model';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonService } from 'app/shared/service/common.service';

@Component({
    selector: 's3-upload[bucket]',
    templateUrl: './s3-upload.component.html',
    styleUrls: ['./s3-upload.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: S3UploadComponent,
            multi: true
        }
    ]
})
export class S3UploadComponent implements OnInit, OnDestroy, ControlValueAccessor {

    unsubscribeAll: Subject<any>;
    uploadListConfig: UploadListConfig;
    fileHashMap: FileHashMap[];
    defaultFileData: any;

    @Input() uploadDescription: string = null;
    @Input() uploadDisabled: boolean = false;
    @Input() uploadCountLimit: number = 5;
    @Input() uploadSizeLimit: number = 10000; // Size in KiloBytes
    @Input() uploadTypeLimit: string = 'audio/*,video/*,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*,application/vnd.oasis.opendocument.presentation,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.text,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/rtf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    @Input() path: string = null;
    @Input() bucket: string;

    /**
     * Default file list
     * Include s3 key in this object
     * Example
     * { uid: '1', name: 'xxx.png', status: 'done', key: 'enrolment/a8304ec7-f85a-41c5-ae89-fcf7f4c21bd1-test.jpg'},
     */
    @Input() defaultFileList: NzUploadFile[] = [];

    @Output() uploadedFileListChange: EventEmitter<FileListItem[]>;

    constructor(private s3UploadService: S3UploadService, private commonService: CommonService) {

        this.unsubscribeAll = new Subject();
        this.uploadedFileListChange = new EventEmitter();

        this.uploadListConfig = {
            showPreviewIcon: true,
            showRemoveIcon: true,
            showDownloadIcon: false
        };

        this.fileHashMap = [];

    }

    ngOnInit(): void {

        this.setDefaultFileData();

    }

    ngOnDestroy(): void {
        this.unsubscribeAll.next();
        this.unsubscribeAll.complete();
    }

    /************************************** Control value accessor methods start ****************************/

    onChange = (fileList: FileListItem[]) => {};
    onTouch = () => {};

    writeValue(obj: any): void {
        // Not Needed
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }
    
    registerOnTouched(fn: any): void {
        this.onTouch = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.uploadDisabled = isDisabled;
    }

    /************************************** Control value accessor methods end ****************************/

    handleFileChange(event: any): void {

        if (event.type === 'start') {
            // Start upload

        } else if (event.type === 'progress') {
            // Progress

        } else {
            // End Upload Or Remove

            const fileList = _.map(_.filter(event.fileList, (value) => value.status === 'done'), (file) => {

                if (!file.key) {
                    
                    const hashIndex = _.indexOf(_.map(this.fileHashMap, 'uid'), file.uid);
    
                    if (hashIndex !== -1) {
                        return {
                            key: this.fileHashMap[hashIndex].key,
                            file: file.originFileObj,
                            bucket: this.bucket
                        };
                    } else {
                        return {
                            key: null,
                            file: null,
                            bucket: this.bucket
                        };
                    }

                } else {

                    return {
                        key: file.key,
                        file: null,
                        bucket: this.bucket
                    };

                }

            });

            this.uploadedFileListChange.next(fileList.length > 0 ? [...fileList] : null);
            this.onTouch();
            this.onChange(fileList.length > 0 ? [...fileList] : null);

        }

    }

    /**
     * Get S3 Key
     * @param {NzUploadFile} file
     * @returns {string}
     */
    getS3Key(file: NzUploadFile): string {

        let name = _.toLower(_.replace(_.trim(file.name), /\s/g, ''));

        let key = `${uuid.v4()}-${name}`;
        
        if (this.path) {
            key = _.last(this.path) === '/' ? `${this.path}${key}` : `${this.path}/${key}`;
        }

        return key;

    }

    /**
     * Custom Request
     * @param {NzUploadXHRArgs} uploadArgs
     * @returns {Subscription}
     */
    customRequest = (uploadArgs: NzUploadXHRArgs): Subscription => {

        const key = this.getS3Key(uploadArgs.file);

        this.fileHashMap.push({key: key, uid: uploadArgs.file.uid});

        return this.s3UploadService.getPresignedUrl(key, this.bucket)
            .pipe(
                switchMap((presignedUrl: string): Observable<any> => {
                    return this.s3UploadService.uploadToS3(uploadArgs, presignedUrl);
                })
            )
            .subscribe(
                (event: HttpEvent<any>) => {

                    switch (event.type) {
                        case HttpEventType.Sent:
                            // Sent Event
                            break;
                        case HttpEventType.ResponseHeader:
                            // Reponse Header Event
                            break;
                        case HttpEventType.UploadProgress:
                            const progress = Math.round(event.loaded / event.total * 100);
                            uploadArgs.onProgress({percent: progress}, uploadArgs.file); // Report progress back to upload component
                            break;
                        case HttpEventType.Response:
                            uploadArgs.onSuccess('Done', uploadArgs.file, event); // Report success back to upload component
                            break;
                    }

                },
                (error) => {
                    uploadArgs.onError(error, uploadArgs.file); // Report error to upload component
                    throw error;
                }
            );

    }

    setDefaultFileData(): void {

        if (this.defaultFileList) {

            if (_.isString(this.defaultFileList)) {
                this.defaultFileData = [this.constructObject(this.defaultFileList)];
            } else if (_.isArray(this.defaultFileList)) {
                this.defaultFileData = _.map(this.defaultFileList, (item) => {
                    if (_.isString(item)) {
                        return this.constructObject(item);
                    } else {
                        return item;
                    }
                });
            }

        } else {
            this.defaultFileData = [];
        }

    }

    constructObject(item: string): any {
        return {
            uid: uuid.v4(),
            name: this.commonService.extractS3FileName(item),
            status: 'done',
            url: this.commonService.getS3FullLink(item),
            key: item
        };
    }
}

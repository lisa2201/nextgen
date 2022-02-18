import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';

import { NzIconModule, NzUploadModule } from 'ng-zorro-antd';

import { S3UploadService } from './s3-upload.service';
import { S3UploadComponent } from './s3-upload.component';

@NgModule({
    declarations: [
        S3UploadComponent
    ],
    imports: [
        CommonModule,

        FlexLayoutModule,

        NzUploadModule,
        NzIconModule
    ],
    exports: [
        S3UploadComponent
    ], 
    providers: [
        S3UploadService
    ]
})
export class S3UploadModule { }

import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { FlexLayoutModule } from '@angular/flex-layout';

import { FuseDirectivesModule } from '@fuse/directives/directives';
import { FusePipesModule } from '@fuse/pipes/pipes.module';

import { NzResultModule } from 'ng-zorro-antd/result';

import { Angular2PromiseButtonModule } from 'angular2-promise-buttons';

import { DeviceDetectorModule } from 'ngx-device-detector';

@NgModule({
    imports  : [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,

        FlexLayoutModule.withConfig({ useColumnBasisZero: false }),

        FuseDirectivesModule,
        FusePipesModule,

        Angular2PromiseButtonModule
            .forRoot({
                spinnerTpl: '<span class="btn-spinner"></span>',
                disableBtn: true,
                btnLoadingClass: 'is-loading',
                handleCurrentBtnOnly: false,
            }),
        
        DeviceDetectorModule.forRoot(),

        NzResultModule
    ],
    exports  : [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,

        FlexLayoutModule,

        FuseDirectivesModule,
        FusePipesModule,

        Angular2PromiseButtonModule,

        DeviceDetectorModule,

        NzResultModule
    ]
})
export class FuseSharedModule
{
    
}

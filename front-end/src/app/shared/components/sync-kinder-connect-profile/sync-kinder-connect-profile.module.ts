import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FlexLayoutModule } from '@angular/flex-layout';
import { FuseSharedModule } from '@fuse/shared.module';

import { NzI18nModule } from 'ng-zorro-antd/i18n';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { TooltipModule } from 'ng2-tooltip-directive';

import { SyncKinderConnectProfileComponent } from './sync-kinder-connect-profile.component';


@NgModule({
    declarations: [
        SyncKinderConnectProfileComponent
    ],
    imports: [
        CommonModule,
        FormsModule,

        FlexLayoutModule.withConfig({ useColumnBasisZero: false }),
        FuseSharedModule,

        NzI18nModule,
        NzIconModule,
        NzButtonModule,
        TooltipModule
    ],
    exports: [
        SyncKinderConnectProfileComponent
    ]
})
export class SyncKinderConnectProfileModule
{

}

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

import { FuseSearchBarModule, FuseShortcutsModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { NzButtonModule } from 'ng-zorro-antd/button';

import { ToolbarComponent } from 'app/layout/components/toolbar/toolbar.component';
import { NzAvatarModule, NzBadgeModule, NzListModule, NzToolTipModule } from 'ng-zorro-antd';
import { MatDividerModule } from '@angular/material/divider';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import {CenterSettingsService} from '../../../main/modules/centre-settings/center-settings/service/center-settings.service';

import { BookingRequestSharedModule } from 'app/main/modules/modules-shared/booking-request/booking-request-shared.module';

@NgModule({
    declarations: [
        ToolbarComponent
    ],
    imports     : [
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatToolbarModule,
        MatDividerModule,

        NzDropDownModule,

        FuseSharedModule,
        FuseSearchBarModule,
        FuseShortcutsModule,
        KM8SharedModule,

        NzButtonModule,
        NzToolTipModule,
        NzBadgeModule,
        NzListModule ,
        NzAvatarModule ,
        NzDividerModule,
        NzCollapseModule,

        BookingRequestSharedModule
    ],
    providers: [
        CenterSettingsService
    ],
    exports     : [
        ToolbarComponent
    ]
})
export class ToolbarModule
{
}

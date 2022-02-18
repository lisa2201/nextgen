
import { NgModule } from '@angular/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FuseSidebarModule } from '@fuse/components';

import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

import { NzFormModule, NzSelectModule, NzEmptyModule, NzButtonModule, NzIconModule, NzRadioModule, NzInputModule, NzCheckboxModule, NzDropDownModule, NzDatePickerModule, } from 'ng-zorro-antd';

import { NzTabsModule, } from 'ng-zorro-antd/tabs';

import { MatTabsModule } from '@angular/material/tabs';
import { BusinessInfoComponent } from './tabs/business-info/business-info.component';
import { S3UploadModule } from '../../../../shared/components';
import { CenterSettingsService } from './service/center-settings.service';

import { CenterSettingsComponent} from './center-settings.component';


const routes = [
    {
        path: '',
        component: CenterSettingsComponent,
        canActivate: [AuthGuard],
        data: {
            belongsTo: 'N24',
            permissions: ['AC0'],
            title: 'Centre Settings'
        }
    }
];

@NgModule({
    declarations: [
        CenterSettingsComponent,
        BusinessInfoComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        KM8SharedModule,
        FuseSharedModule,
        FuseSidebarModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,
        MatProgressBarModule,

        NzFormModule,
        NzSelectModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzRadioModule,
        NzInputModule,
        NzCheckboxModule,
        NzDropDownModule,
        NzModalModule,
        NzSwitchModule,
        NzDatePickerModule,
        NzTabsModule,
        TranslateModule,

        MatTabsModule,
        
        S3UploadModule
    ],
    providers: [
        CenterSettingsService
    ]
})
export class CenterSettingsModule {}

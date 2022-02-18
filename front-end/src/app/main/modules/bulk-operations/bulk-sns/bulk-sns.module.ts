import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzDatePickerModule, NzDescriptionsModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { BulkSnsComponent } from './bulk-sns.component';
import { BulkSNSService } from './bulk-sns.service';
import { NzListModule } from 'ng-zorro-antd/list';
import { ScriptDialogComponent } from './Dialog/script-dialog/script-dialog.component';


const APP_ROUTES: Routes = [
    {
        path: '',
        component: BulkSnsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N54',
            permissions: ['AC0'],
            title: 'Bulk Operation'
        },
        resolve:
        {
            data: BulkSNSService
        }
    }
];

@NgModule({
    declarations: [
        BulkSnsComponent,
        ScriptDialogComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        TranslateModule,

        FlexLayoutModule,

        NzDividerModule,
        NzFormModule,
        NzInputModule,
        NzTableModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzSelectModule,
        NzCheckboxModule,
        NzSwitchModule,
        NzGridModule,
        NzRadioModule,
        NzDatePickerModule,
        NzDescriptionsModule,
        NzListModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatMenuModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule
    ],
    providers: [
        BulkSNSService
    ]
})
export class BulkSNSModule { }

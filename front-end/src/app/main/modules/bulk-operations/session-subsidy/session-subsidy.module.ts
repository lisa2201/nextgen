import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionSubsidyComponent } from './session-subsidy.component';
import { SessionSubsidyListViewComponent } from './session-subsidy-list-view/session-subsidy-list-view.component';
import { SessionSubsidyLeftSidenavComponent } from './sidenavs/left/session-subsidy-left-sidenav/session-subsidy-left-sidenav.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzDatePickerModule, NzDescriptionsModule, NzTagModule } from 'ng-zorro-antd';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { SessionSubsidyResolverService } from './services/session-subsidy-resolver.service';
import { SessionSubsidyService } from './services/session-subsidy.service';
import { SusbsidyDetailDialogComponent } from './dialogs/susbsidy-detail-dialog/susbsidy-detail-dialog.component';
import { EntitlementDetailsDialogComponent } from './dialogs/entitlement-details-dialog/entitlement-details-dialog.component';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: SessionSubsidyComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N33',
            permissions: ['AC0'],
            title: 'Manage Session Subsidy'
        },
        resolve: {
            resolveData: SessionSubsidyResolverService
        }
    }
];

@NgModule({
    declarations: [
        SessionSubsidyComponent, 
        SessionSubsidyListViewComponent, 
        SessionSubsidyLeftSidenavComponent,
        SusbsidyDetailDialogComponent, 
        EntitlementDetailsDialogComponent
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
        NzTagModule,

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
        SessionSubsidyService,
        SessionSubsidyResolverService
    ]
})
export class SessionSubsidyModule { }

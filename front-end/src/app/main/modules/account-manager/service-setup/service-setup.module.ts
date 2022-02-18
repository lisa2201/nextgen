import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceSetupComponent } from './service-setup.component';
import { RouterModule, Routes } from '@angular/router';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzLayoutModule, NzCardModule, NzGridModule, NzTableModule, NzTabsModule, NzFormModule, NzButtonModule, NzSelectModule, NzDividerModule, NzIconModule, NzModalModule, NzEmptyModule, NzInputModule, NzDatePickerModule, NzAlertModule, NzDescriptionsModule } from 'ng-zorro-antd';
import { KM8DirectivesModule } from 'app/shared/directives/directives';
import { FuseSharedModule } from '@fuse/shared.module';

import { ServiceSetupEditAddressComponent } from './dialogs/service-setup-edit-address/service-setup-edit-address.component';
import { ServiceSetupEditFinancialComponent } from './dialogs/service-setup-edit-financial/service-setup-edit-financial.component';
import { ServiceSetupEditContactComponent } from './dialogs/service-setup-edit-contact/service-setup-edit-contact.component';
import { ServiceSetupListResolverService } from './services/service-setup-list-resolver.service';
import { ServiceViewComponent } from './service-view/service-view.component';
import { ServiceSetupViewResolverService } from './services/service-setup-view-resolver.service';
import { ServiceSetupEditNameComponent } from './dialogs/service-setup-edit-name/service-setup-edit-name.component';
import { AccsPercentageComponent } from './dialogs/accs-percentage/accs-percentage.component';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { ReadServiceDialogComponent } from './dialogs/read-service-dialog/read-service-dialog.component';



const APP_ROUTES: Routes = [
    {
        path: '',
        component: ServiceSetupComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N20',
            permissions: ['AC0'],
            title: 'Manage Services'
        },
        resolve: {
            resolveData: ServiceSetupListResolverService
        }
    },
    {
        path: ':id/view',
        component: ServiceViewComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N20',
            permissions: ['AC0'],
            title: 'Manage Services'
        },
        resolve: {
            resolveData: ServiceSetupViewResolverService
        }
    }
];

@NgModule({
    declarations: [
        ServiceSetupComponent,
        ServiceSetupEditAddressComponent,
        ServiceSetupEditFinancialComponent,
        ServiceSetupEditContactComponent,
        ServiceViewComponent,
        ServiceSetupEditNameComponent,
        AccsPercentageComponent,
        ReadServiceDialogComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),

        MatMenuModule,
        MatButtonModule,
        MatToolbarModule,
        MatIconModule,
        MatDialogModule,
        FlexLayoutModule,

        NzLayoutModule,
        NzCardModule,
        NzGridModule,
        NzTabsModule,
        NzTableModule,
        NzFormModule,
        NzSelectModule,
        NzButtonModule,
        NzIconModule,
        NzDividerModule,
        NzModalModule,
        NzInputModule,
        NzEmptyModule,
        NzDatePickerModule,
        NzAlertModule,
        NzSpinModule,
        NzDescriptionsModule,

        KM8DirectivesModule,

        FuseSharedModule,

        KM8SharedModule
    ]
})


export class ServiceSetupModule { }

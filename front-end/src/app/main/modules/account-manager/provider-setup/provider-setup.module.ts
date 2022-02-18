import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProviderSetupResolverService } from './services/provider-setup-resolver.service';
import { Routes, RouterModule } from '@angular/router';
import { ProviderSetupComponent } from './provider-setup.component';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { ProviderSetupService } from './services/provider-setup.service';
import { ProviderViewComponent } from './view/provider-view.component';
import { ProviderViewResolverService } from './services/provider-view-resolver.service';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzCardModule, NzGridModule, NzTabsModule, NzTableModule, NzLayoutModule, NzFormModule, NzSelectModule, NzButtonModule, NzIconModule, NzDividerModule, NzModalModule, NzInputModule, NzEmptyModule, NzAlertModule, NzListModule } from 'ng-zorro-antd';
import { KM8DirectivesModule } from 'app/shared/directives/directives';
import { ProviderEditAddressComponent } from './dialogs/provider-edit-address/provider-edit-address.component';
import { ProviderEditFinacialComponent } from './dialogs/provider-edit-finacial/provider-edit-finacial.component';
import { FuseSharedModule } from '@fuse/shared.module';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { EditContactComponent } from './dialogs/edit-contact/edit-contact.component';
import { AddProviderComponent } from './dialogs/add-provider/add-provider.component';
import { ProviderBusinessNameChangeComponent } from './dialogs/provider-business-name-change/provider-business-name-change.component';

import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';


const routes: Routes = [
    {
        path: '',
        component: ProviderSetupComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N20',
            permissions: ['AC0'],
            title: 'Manage Provider'
        },
        resolve: {
            resolveData: ProviderSetupResolverService
        }
    },
    {
        path: ':id/view',
        component: ProviderViewComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N20',
            permissions: ['AC0'],
            title: 'Manage Provider'
        },
        resolve: {
            resolveData: ProviderViewResolverService
        }
    }
];

@NgModule({
    declarations: [
        ProviderSetupComponent,
        ProviderViewComponent,
        ProviderEditAddressComponent,
        ProviderEditFinacialComponent,
        EditContactComponent,
        AddProviderComponent,
        ProviderBusinessNameChangeComponent
        
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),

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
        NzListModule,

        KM8DirectivesModule,

        FuseSharedModule,
    ],
    providers: [
        ProviderSetupResolverService,
        ProviderViewResolverService,
        ProviderSetupService
    ]
})
export class ProviderSetupModule { }

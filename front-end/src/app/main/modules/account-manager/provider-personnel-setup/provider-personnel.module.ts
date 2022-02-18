import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { KM8DirectivesModule } from 'app/shared/directives/directives';
import { NzResultModule, NzLayoutModule, NzCardModule, NzGridModule, NzDatePickerModule, NzEmptyModule, NzInputModule, NzModalModule, NzIconModule, NzButtonModule, NzSelectModule, NzTableModule, NzTabsModule, NzDividerModule, NzFormModule, NzRadioModule, NzPopoverModule, NzListModule, NzSpinModule, NzCheckboxModule, NzUploadModule } from 'ng-zorro-antd';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FuseSharedModule } from '@fuse/shared.module';

import { BranchService } from '../../branch/services/branch.service';
import { ServicePersonalService } from './service/personal-service';
import { InvitationService } from '../../invitation/services/invitation.service';
import { TooltipModule } from 'ng2-tooltip-directive';
import { NewProviderPersonnelComponent } from './dialog/new-service-personal/new-provider-personnel/new-provider-personnel.component';
import { ProviderPersonalService } from './service/provider-personnel-service';
import { ProviderPersonnelViewComponent } from './personal-provider/provider-personnel-view/provider-personnel-view.component';
import { ProviderPersonnelViewService } from './service/provider-personnel-view-service';
import { ProviderPersonnelAddRoleComponent } from './personal-provider/provider-personnel-view/dialog/provider-personnel-add-role/provider-personnel-add-role.component';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzProgressModule } from 'ng-zorro-antd/progress';

import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatRadioModule } from '@angular/material/radio';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';

import { PersonalProviderComponent } from './personal-provider/personal-provider.component';

const APP_ROUTES: Routes = [
    {
        
        path: '',
        component: PersonalProviderComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N20',
            permissions: ['AC0'],
            title: 'Manage Provider Personnel'
        },
        resolve: {
            resolveData: ProviderPersonalService
        }
    },
    {
        path: ':id/view',
        component: ProviderPersonnelViewComponent,
        canActivate:
        [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N20',
            permissions: ['AC0'],
            title: 'Manage Provider Personnel'
        },
        resolve:
        {
            peroviderPersonnel: ProviderPersonnelViewService
        }
    },
];

@NgModule({
    declarations: [
        PersonalProviderComponent,
        NewProviderPersonnelComponent,
        ProviderPersonnelViewComponent,
        ProviderPersonnelAddRoleComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),

        NzResultModule,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatListModule,
        MatRadioModule,
        MatSidenavModule,
        MatProgressBarModule,

        FuseSharedModule,
        
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
        NzRadioModule,
        NzPopoverModule,
        NzListModule,
        NzSpinModule,
        TooltipModule,
        NzCheckboxModule,
        NzUploadModule,
        NzAvatarModule,
        NzAlertModule,
        NzSkeletonModule,
        NzProgressModule,

        KM8DirectivesModule,

        FuseSharedModule,

    ],
    providers: [
        ProviderPersonalService,
        ServicePersonalService,
        InvitationService,
        BranchService,
        ProviderPersonnelViewService
    ]
})
export class ProviderPersonnelModule { }

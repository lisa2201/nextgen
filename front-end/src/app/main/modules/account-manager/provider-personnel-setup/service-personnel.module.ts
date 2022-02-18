import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ProviderPersonnelSetupComponent } from './provider-personnel-setup.component';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { KM8DirectivesModule } from 'app/shared/directives/directives';
import { NzResultModule, NzLayoutModule, NzCardModule, NzDatePickerModule, NzEmptyModule, NzInputModule, NzModalModule, NzIconModule, NzButtonModule, NzSelectModule, NzTableModule, NzTabsModule, NzDividerModule, NzFormModule, NzRadioModule, NzPopoverModule, NzSpinModule, NzCheckboxModule, NzUploadModule } from 'ng-zorro-antd';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FuseSharedModule } from '@fuse/shared.module';
import { PersonalSelectionViewComponent } from './personal-selection-view/personal-selection-view.component';
import { PersonalServiceComponent } from './personal-service/personal-service.component';
import { NewServicePersonalComponent } from './dialog/new-service-personal/new-service-personal.component';
import { UsersService } from '../../user/services/users.service';
import { BranchService } from '../../branch/services/branch.service';
import { ServicePersonalService } from './service/personal-service';
import { InvitationService } from '../../invitation/services/invitation.service';
import { TooltipModule } from 'ng2-tooltip-directive';
import { NzListModule } from 'ng-zorro-antd/list';
import { ServicePersonnelViewComponent } from './personal-service/service-personnel-view/service-personnel-view.component';
import { ServicePersonnelViewService } from './service/service-personnel-view-service';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { AddRoleServicePersonnelComponent } from './personal-service/dialog/add-role-service-personnel/add-role-service-personnel.component';
import { AdDcelarationServicePersonnelComponent } from './personal-service/dialog/add-role-service-personnel/ad-dcelaration-service-personnel/ad-dcelaration-service-personnel.component';
import { AddWwccServicePersonnelComponent } from './personal-service/dialog/add-role-service-personnel/add-wwcc-service-personnel/add-wwcc-service-personnel.component';
import { NzAlertModule } from 'ng-zorro-antd/alert';
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


const APP_ROUTES: Routes = [
    {
        
        path: '',
        component: ProviderPersonnelSetupComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N20',
            permissions: ['AC0'],
            title: 'Manage Services Personnel'
        },
        resolve: {
            resolveData: ServicePersonalService
        }
    },
    {
        path: ':id/view',
        component: ServicePersonnelViewComponent,
        canActivate:
        [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N20',
            permissions: ['AC0'],
            title: 'Manage Services Personnel'
        },
        resolve:
        {
            servicePersonnel: ServicePersonnelViewService
        }
    },
];

@NgModule({
    declarations: [
        ProviderPersonnelSetupComponent,
        PersonalSelectionViewComponent,
        PersonalServiceComponent,
        NewServicePersonalComponent,
        ServicePersonnelViewComponent,
        AddRoleServicePersonnelComponent,
        AdDcelarationServicePersonnelComponent,
        AddWwccServicePersonnelComponent
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
        NzSkeletonModule,
        NzAvatarModule,
        NzAlertModule,
        NzProgressModule,

        KM8DirectivesModule,

        FuseSharedModule,

    ],
    providers: [
        ServicePersonalService,
        InvitationService,
        BranchService,
        ServicePersonnelViewService
    ]
})
export class ServicePersonnelModule { }

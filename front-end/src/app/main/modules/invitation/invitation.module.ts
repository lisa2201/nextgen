import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { FuseSidebarModule } from '@fuse/components';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { InvitationService } from './services/invitation.service';
import { BranchService } from '../branch/services/branch.service';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { InvitationComponent } from './invitation.component';
import { InvitationAddOrEditDialogComponent } from './dialogs/new-or-edit/new-or-edit.component';
import { InvitationLeftSidenavComponent } from './sidenavs/left/invitation-left-sidenav/invitation-left-sidenav.component';
import { InvitationListViewComponent } from './list-view/list-view.component';
import { InvitationSetRolesComponent } from './modals/invitation-set-roles/invitation-set-roles.component';
import { InvitationSingleNewOrEditComponent } from './dialogs/single-new-or-edit/single-new-or-edit.component';
import { ShowInvitationRolesComponent } from './modals/show-invitation-roles/show-invitation-roles.component';

const routes = [
    {
        path: '',
        component: InvitationComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N09',
            permissions: ['AC0'],
            title: 'Manage Invitations'
        },
        resolve:
        {
            invitations: InvitationService
        }
    }
];

@NgModule({
    declarations: [
        InvitationComponent,
        InvitationListViewComponent,
        InvitationAddOrEditDialogComponent,
        InvitationLeftSidenavComponent,
        InvitationSetRolesComponent,
        InvitationSingleNewOrEditComponent,
        ShowInvitationRolesComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,
        KM8SharedModule,

        FuseSidebarModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,

        NzFormModule,
        NzSelectModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzRadioModule,
        NzInputModule,
        NzCheckboxModule,
        NzDropDownModule,
        NzTableModule,
        NzDividerModule,
        NzModalModule,
        NzSwitchModule,
        NzAlertModule
    ],
    providers: [
        InvitationService,
        BranchService
    ]
})

export class InvitationModule { }

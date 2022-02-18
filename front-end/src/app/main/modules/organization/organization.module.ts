import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FuseSidebarModule } from '@fuse/components';
import { AuthGuard } from 'app/shared/guard/auth.guard';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

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
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';

import { OrganizationService } from './services/organization.service';
import { OrganizationViewResolverService } from './services/organization-view-resolver.service';

import { OrganizationComponent } from '../organization/organization.component';
import { NewOrEditComponent } from './dialogs/new-or-edit/new-or-edit.component';
import { OrgEditViewComponent } from './org-edit-view/org-edit-view.component';
import { OrganizationLeftSidenavComponent } from './sidenavs/left/organization-left-sidenav/organization-left-sidenav.component';
import { ListViewComponent } from './list-view/list-view.component';
import { AdditionalDetailsComponent } from './dialogs/additional-details/additional-details.component';
import { OrgBranchAccessComponent } from './org-edit-view/branch-access/branch-access.component';

const routes = [
    {
        path: '',
        component: OrganizationComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N02',
            permissions: ['AC0'],
            title: 'Subscriber Management'
        },
        resolve:
        {
            organizations: OrganizationService
        }
    },
    {
        path: ':id/view',
        component: OrgEditViewComponent,
        canActivate:
            [
                AuthGuard
            ],
        data:
        {
            belongsTo: 'N02',
            permissions: ['AC1'],
            title: 'Subscriber Management - Edit'
        },
        resolve:
        {
            orgData: OrganizationViewResolverService
        }
    },
    {
        path: '**',
        redirectTo: ''
    }
];


@NgModule({
    declarations: [
        OrganizationComponent,
        NewOrEditComponent,
        OrganizationLeftSidenavComponent,
        ListViewComponent,
        OrgEditViewComponent,
        AdditionalDetailsComponent,
        OrgBranchAccessComponent,
    ],
    imports: [
        RouterModule.forChild(routes),
        TranslateModule,
        FuseSharedModule,
        KM8SharedModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,
        MatSelectModule,
        MatTabsModule,
        MatDatepickerModule,
        MatInputModule,

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
        FuseSidebarModule,
        NzDividerModule,
        NzCardModule,
        NzListModule,
        NzSpinModule,
        NzSwitchModule,
        NzTabsModule,
        NzTagModule,
        NzDatePickerModule,
        NzUploadModule,
        NzCollapseModule,
        NzGridModule,
        NzSkeletonModule,
        NzAvatarModule,
        NzBadgeModule
    ],
    providers: [
        OrganizationService,
        OrganizationViewResolverService
    ]
})
export class OrganizationModule { }

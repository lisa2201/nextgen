import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { FuseSidebarModule } from '@fuse/components';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { KM8PipesModule } from 'app/shared/pipes/pipe.module';

import { DynamicModule } from 'ng-dynamic-component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { TooltipModule } from 'ng2-tooltip-directive';
import { SyncKinderConnectProfileModule } from 'app/shared/components/sync-kinder-connect-profile/sync-kinder-connect-profile.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { UsersService } from './services/users.service';
import { UserService } from './services/user.service';
import { BranchService } from '../branch/services/branch.service';
import { RoomService } from '../room/services/room.service';

import { UserComponent } from './user.component';
import { UserViewComponent } from './user-view/user-view.component';

import { ParentFiltersComponent } from './sidenavs/left/filters/filters.component';
import { ManageUsersLeftSidenavComponent } from './sidenavs/left/manage-users-left-sidenav/manage-users-left-sidenav.component';
import { ManagerUsersCardLeftSidenavComponent } from './sidenavs/left/manager-users-card-left-sidenav/manager-users-card-left-sidenav.component';

import { UserBaseViewAdministrationComponent } from './user-base-view/user-base-view-administration/user-base-view-administration.component';
import { UserBaseViewOwnerComponent } from './user-base-view/user-base-view-owner/user-base-view-owner.component';
import { UserBaseViewRootComponent } from './user-base-view/user-base-view-root/user-base-view-root.component';

import { ManageUsersOwnerListViewComponent } from './list-view/owner/list-view.component';
import { ManageUsersAdministrationListViewComponent } from './list-view/administration/list-view.component';
import { ParentViewComponent } from './parent-view/parent-view.component';
import { ParentListViewComponent } from './parent-view/parent-list-view/parent-list-view.component';
import { ParentDetailsViewComponent } from './parent-view/parent-details-view/parent-details-view.component';
import { UserViewRoleAndPermissionsComponent } from './user-view/role-and-permissions/role-and-permissions.component';
import { UserViewRoleAndPermissionsWithBranchComponent } from './user-view/role-and-permissions-with-branch/role-and-permissions-with-branch.component';
import { ParentAddDialogComponent } from './parent-view/dialogs/new/new.component';
import { ParentBulkInvitationComponent } from './parent-view/dialogs/parent-bulk-invitation/parent-bulk-invitation.component';
import { UserSetRoomComponent } from './user-view/user-set-room/user-set-room.component';
import { UserResetPasswordComponent } from './modals/reset-password/reset-password.component';
import {S3UploadModule} from '../../../shared/components';

const routes = [
    {
        path: '',
        component: UserComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N04',
            permissions: ['AC0'],
            title: 'Manage Users'
        },
        resolve: {
            users: UsersService
        }
    },
    {
        path: 'user/:id',
        component: UserViewComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N04',
            permissions: ['AC1'],
            title: 'Manage Users - Edit'
        },
        resolve: {
            users: UserService
        }
    },
    {
        path: '**',
        redirectTo: ''
    }
];

@NgModule({
    declarations: [
        UserComponent,
        UserViewComponent,
        ParentFiltersComponent,
        ManageUsersLeftSidenavComponent,
        ManagerUsersCardLeftSidenavComponent,

        UserBaseViewOwnerComponent,
        ManageUsersOwnerListViewComponent,

        UserBaseViewAdministrationComponent,
        ManageUsersAdministrationListViewComponent,

        UserBaseViewRootComponent,

        ParentViewComponent,
        ParentListViewComponent,
        ParentDetailsViewComponent,
        
        UserViewRoleAndPermissionsComponent,
        UserViewRoleAndPermissionsWithBranchComponent,
        ParentAddDialogComponent,
        ParentBulkInvitationComponent,

        UserSetRoomComponent,

        UserResetPasswordComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,
        KM8SharedModule,
        KM8PipesModule,

        FuseSidebarModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,

        NzFormModule,
        NzSelectModule,
        NzSpinModule,
        NzCardModule,
        NzListModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzRadioModule,
        NzInputModule,
        NzCheckboxModule,
        NzDropDownModule,
        NzTabsModule,
        NzDividerModule,
        NzGridModule,
        NzSwitchModule,
        NzTableModule,
        NzPaginationModule,
        NzBadgeModule,
        NzDatePickerModule,
        NzAvatarModule,
        NzSkeletonModule,

        InfiniteScrollModule,
        TooltipModule,
        S3UploadModule,

        DynamicModule.forRoot(),

        SyncKinderConnectProfileModule
    ],
    providers: [
        UsersService,
        UserService,
        BranchService,
        RoomService
    ]
})
export class UserModule {}

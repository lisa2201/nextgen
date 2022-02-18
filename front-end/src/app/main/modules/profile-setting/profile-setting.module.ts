import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { FuseSidebarModule } from '@fuse/components';
import {
    NzAvatarModule,
    NzLayoutModule,
    NzIconModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzSpinModule,
    NzDatePickerModule,
    NzSelectModule,
    NzSwitchModule
} from 'ng-zorro-antd';
import { ProfileSettingComponent } from './profile-setting.component';
import { UserHeaderComponent } from './header/header.component';
import { PersonalInfoComponent } from './tabs/personal-Info/personal-Info.component';
import { UserNotificationComponent } from './tabs/personal-Info/user-notification/user-notification.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { ProfileSettingService } from './services/profile-setting.service';
import {S3UploadModule} from '../../../shared/components';
import {UserProfileImageComponent} from './tabs/user-profile-image/user-profile-image.component';
import {KM8SharedModule} from '../../../shared/shared.module';
import { EmailNotificationsComponent } from './tabs/email-notifications/email-notifications.component';
const routes = [
    {
        path: '',
        canActivate: [AuthGuard],
        component: ProfileSettingComponent,
        data: {
            belongsTo: 'N00',
            title: 'Profile'
        },
        resolve: {
            profile: ProfileSettingService
        }
    }
];

@NgModule({
    declarations: [
        ProfileSettingComponent,
        UserHeaderComponent,
        PersonalInfoComponent,
        UserNotificationComponent,
        UserProfileImageComponent,
        EmailNotificationsComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        TranslateModule,
        FuseSharedModule,
        KM8SharedModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatSelectModule,
        MatButtonModule,
        MatDividerModule,
        MatIconModule,
        MatTabsModule,
        FuseSharedModule,
        FuseSidebarModule,
        InfiniteScrollModule,

        NzAvatarModule,
        NzLayoutModule,
        NzIconModule,
        NzButtonModule,
        NzFormModule,
        NzInputModule,
        NzSpinModule,
        NzSelectModule,
        NzDatePickerModule,
        S3UploadModule,
        NzSwitchModule,
    ],
    providers:[
        ProfileSettingService
    ]
})
export class ProfileSettingModule {}

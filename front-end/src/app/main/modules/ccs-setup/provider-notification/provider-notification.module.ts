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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';

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

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { ProviderNotificationComponent } from './provider-notification.component';
import { ProviderMessageComponent } from './provider-message/provider-message.component';
import { CorrespondenceListComponent } from './correspondence-list/correspondence-list.component';
import { ProviderNotificationService } from './services/provider-notification.service';
import { NzDatePickerModule, NzCardModule, NzGridModule, NzListModule } from 'ng-zorro-antd';
import {CcsNotificationSidenavComponent} from './provider-message/sidenav/ccs-notification-sidenav.component';
import {EntitlementHistoryComponent} from '../../entitlement-variation-ccs/entitlement-history/entitlement-history.component';
import {CcsEntitlementHistoryService} from '../../entitlement-variation-ccs/services/ccs-entitlement-history.service';
import {NzPaginationModule} from 'ng-zorro-antd/pagination';
import { AccountManagerService } from '../../account-manager/account-manager.service';
import { CorrespondenceLeftSideNavComponent } from './correspondence-list/sidenav/left/correspondence-left-side-nav/correspondence-left-side-nav.component';

const routes = [
    {
        path: '',
        component: ProviderNotificationComponent,
        canActivate: [AuthGuard],
        data: {
            belongsTo: 'N22',
            permissions: ['AC0'],
            title: 'Manage Provider Notifications'
        },
        resolve: {
            ccs: ProviderNotificationService,
            entitlementHistory: CcsEntitlementHistoryService
        }
    }
];

@NgModule({
    declarations: [
        ProviderNotificationComponent,
        ProviderMessageComponent,
        CorrespondenceListComponent,
        CcsNotificationSidenavComponent,
        CorrespondenceLeftSideNavComponent,
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
        MatProgressBarModule,
        MatTabsModule,

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
        NzPaginationModule,
        NzDividerModule,
        NzModalModule,
        NzSwitchModule,
        NzDatePickerModule,
        NzCardModule,
        NzGridModule,
        NzListModule
    ],
    providers: [ProviderNotificationService, CcsEntitlementHistoryService, AccountManagerService],
})
export class ProviderNotificationModule {}

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';

import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzPaginationModule, NzRadioModule, NzDropDownModule, NzLayoutModule, NzAvatarModule, NzGridModule, NzTableModule, NzDatePickerModule} from 'ng-zorro-antd';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { TranslateModule } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { FuseSidebarModule } from '@fuse/components';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { MessageComponent } from './message.component';
import { MessageListViewComponent } from './message-list-view/message-list-view.component';
import { MessageSidebarFilterComponent } from './message-sidebar-filter/message-sidebar-filter.component';
import { MatMenuModule } from '@angular/material/menu';
import { QueryMessageService } from './service/message.service';
import { BranchService } from '../branch/services/branch.service';

const routes = [
    {
        path: '',
        component: MessageComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N48',
            permissions: ['AC0']
        }
    }
];
@NgModule({
    declarations: [
        MessageComponent,
        MessageListViewComponent,
        MessageSidebarFilterComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        NzPaginationModule,
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
        NzCardModule,
        NzListModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzCheckboxModule,
        NzCollapseModule,
        NzSpinModule,
        NzSwitchModule,
        NzRadioModule,
        NzSelectModule,
        NzDropDownModule,
        NzLayoutModule,
        NzAvatarModule,
        NzGridModule,
        NzAlertModule,
        NzBadgeModule,
        NzToolTipModule,
        NzTableModule,
        NzDatePickerModule

    ],
    providers: [
        QueryMessageService,
        BranchService
    ]
})
export class MessageModule {}

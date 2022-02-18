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

// import { ProviderNotificationComponent } from './provider-notification.component';
// import { ProviderMessageComponent } from './provider-message/provider-message.component';
// import { CorrespondenceListComponent } from './correspondence-list/correspondence-list.component';
// import { ProviderNotificationService } from './services/provider-notification.service';
import {
    NzDatePickerModule,
    NzCardModule,
    NzGridModule,
    NzListModule,
    NzDescriptionsModule,
    NzPaginationModule
} from 'ng-zorro-antd';
import {SessionSubmissionsComponent} from './session-submissions-component/session-submissions.component';
import {ViewSessionReportsComponent} from './view-session-reports/view-session-reports.component';
import {ChildrenService} from '../child/services/children.service';
import {ChildService} from '../child/services/child.service';
import {ChildEnrolmentService} from '../child/enrolment/services/enrolment.service';
import {KM8DirectivesModule} from '../../../shared/directives/directives';
import {CommonModule} from '@angular/common';
import {ViewSessionReportsLeftSidenavComponent} from './sidenavs/view-session-reports-left-sidenav/view-session-reports-left-sidenav.component';
import {ViewSessionReportsListViewComponent} from './view-session-reports-list-view/view-session-reports-list-view.component';

const routes = [
    {
        path: '',
        component: ViewSessionReportsComponent,
        canActivate: [AuthGuard],
        data: {
            belongsTo: 'N48',
            permissions: ['AC0']
        },
        resolve:
        {
            children: ChildrenService
        }
    }
];

@NgModule({
    declarations: [
        ViewSessionReportsComponent,
        SessionSubmissionsComponent,
        ViewSessionReportsLeftSidenavComponent,
        ViewSessionReportsListViewComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        KM8SharedModule,

        FuseSidebarModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,
        MatProgressBarModule,

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
        NzDatePickerModule,
        NzCardModule,
        NzGridModule,
        NzListModule,
        CommonModule,
        TranslateModule,

        MatTabsModule,

        FuseSharedModule,

        KM8DirectivesModule,
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
        NzPaginationModule,
        NzDescriptionsModule,
    ],
    providers: [
        ChildrenService
    ]
    // providers: [ProviderNotificationService],
})
export class SessionSubmissionsModule {}

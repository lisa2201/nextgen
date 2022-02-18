import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

import { FuseSidebarModule } from '@fuse/components';
import { TooltipModule } from 'ng2-tooltip-directive';
import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';
import { SessionSubmissionSharedModule } from '../../modules-shared/session-submission/session-submission-shared.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { NgProgressModule } from 'ngx-progressbar';

import { BulkSessionSubmissionService } from './services/bulk-session-submission.service';
import { ChildrenService } from '../../child/services/children.service';
import { ChildBookingService } from '../../child/booking/services/booking.service';

import { BulkSessionSubmissionComponent } from './session-submission.component';
import { BulkSubmissionListViewComponent } from './list-view/list-view.component';
import { BulkSubmissionSubmittedTabComponent } from './list-view/tab/submitted-tab/submitted-tab.component';
import { BulkSubmissionWaitingTabComponent } from './list-view/tab/waiting-tab/waiting-tab.component';
import { BulkSubmissionsManageSessionsComponent } from './dialogs/manage-sessions/manage-sessions.component';
import { ChildSessionSubmissionService } from '../../child/session-submission/services/session-submission.service';
import { BulkSubmissionsSetUpdateValuesComponent } from './modals/set-update-values/set-update-values.component';
import { SessionSummaryViewComponent } from './sidenavs/right/session-summary-view/session-summary-view.component';

const routes = [
    {
        path: '',
        component: BulkSessionSubmissionComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N33',
            permissions: ['AC0'],
            title: 'Manage Session Submissions'
        },
        resolve:
        {
            depends: BulkSessionSubmissionService
        }
    }
];

@NgModule({
    declarations: [
        BulkSessionSubmissionComponent,
        BulkSubmissionListViewComponent,
        BulkSubmissionSubmittedTabComponent,
        BulkSubmissionWaitingTabComponent,
        BulkSubmissionsManageSessionsComponent,
        BulkSubmissionsSetUpdateValuesComponent,
        SessionSummaryViewComponent
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

        RyTimePickerModule,

        NzFormModule,
        NzSelectModule,
        NzSpinModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzRadioModule,
        NzInputModule,
        NzCheckboxModule,
        NzDropDownModule,
        NzTabsModule,
        NzGridModule,
        NzSwitchModule,
        NzTableModule,
        NzDatePickerModule,
        NzModalModule,
        NzSkeletonModule,
        NzListModule,
        NzAvatarModule,
        NzDividerModule,
        NzPaginationModule,
        NzAlertModule,
        NzBadgeModule,
        NzPopoverModule,

        FuseSidebarModule,

        TooltipModule,

        SessionSubmissionSharedModule,

        NgProgressModule
    ],
    providers: [
        BulkSessionSubmissionService,
        ChildrenService,
        ChildBookingService,
        ChildSessionSubmissionService
    ]
})

export class BulkSessionSubmissionsModule { }

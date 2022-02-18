import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { KM8SharedModule } from 'app/shared/shared.module';

import { TooltipModule } from 'ng2-tooltip-directive';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { DashboardComponent } from './dashboard.component';
import { FuseWidgetModule } from '@fuse/components/widget/widget.module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';

import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

import { BookingWidgetModule } from '../widgets/booking/booking-widgets.module';
import { ParentPaymentWidgetModule } from '../widgets/parent-payment-widget/parent-payment-widget.module';
import { AttendanceWidgetModule } from '../widgets/attendance/attendance-widgets.module';
import { WaitlistWidgetModule } from '../widgets/waitlist/waitlist-widget.module';
import {CcsNotificationsDashboardModule} from '../widgets/ccs-notifications/ccs-notifications-dashboard.module';
import {CenterWiseRatioModule} from '../widgets/center-wise-ratio/center-wise-ratio.module';
import {SessionSubmissionsWidgetModule} from '../widgets/session-submissions-widget/session-submissions-widget.module';

import { DashboardService } from './services/dashboard.service';

const routes = [
    {
        path: '',
        component: DashboardComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N01',
            permissions: ['AC0'],
            title: 'Dashboard'
        },
        resolve:
        {
            branches: DashboardService
        }
    }
];

@NgModule({
    declarations: [
        DashboardComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,
        FuseWidgetModule,
        FuseSharedModule,

        MatFormFieldModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,

        NzGridModule,
        NzSelectModule,
        NzTagModule,
        
        KM8SharedModule,

        TooltipModule,

        NzUploadModule,
        NzButtonModule,
        NzIconModule,
        NzDatePickerModule,

        BookingWidgetModule,
        ParentPaymentWidgetModule,
        AttendanceWidgetModule,
        WaitlistWidgetModule,
        CcsNotificationsDashboardModule,
        CenterWiseRatioModule,
        SessionSubmissionsWidgetModule
    ],
    providers: [
        DashboardService
    ]
})

export class DashboardModule { }

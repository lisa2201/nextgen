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
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { FuseSidebarModule } from '@fuse/components';

import { TooltipModule } from 'ng2-tooltip-directive';

import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { ChildBookingService } from '../booking/services/booking.service';
import { ChildAttendanceService } from './services/attendance.service';

import { ChildAttendanceComponent } from './attendance.component';
import { AttendanceWeekViewComponent } from './week-view/week-view.component';

const routes = [
    {
        path: 'attendance',
        component: ChildAttendanceComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N28',
            permissions: ['AC0'],
            title: 'Child - Attendance'
        },
        resolve:
        {
            child: ChildAttendanceService
        }
    }
];

@NgModule({
    declarations: [
        ChildAttendanceComponent,
        AttendanceWeekViewComponent
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
        NzAlertModule,
        NzSkeletonModule,
        NzListModule,
        NzCardModule,
        NzAvatarModule,
        NzDividerModule,

        FuseSidebarModule,

        TooltipModule
    ],
    providers: [
        ChildAttendanceService,
        ChildBookingService
    ]
})

export class ChildAttendanceModule { }

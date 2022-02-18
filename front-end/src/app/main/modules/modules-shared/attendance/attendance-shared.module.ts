import { NgModule } from '@angular/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FuseSidebarModule } from '@fuse/components';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { RyTimePickerModule } from 'app/shared/components';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { ChildrenAttendanceReportComponent } from './dialogs/attendance-report/attendance-report.component';
import { SetAttendanceTimeComponent } from './modals/set-attendance/set-attendance.component';
import { BatchUpdateAttendanceComponent } from './dialogs/batch-update-attendance/batch-update-attendance.component';
import { BatchUpdateAttendanceChildListSidenavComponent } from './dialogs/batch-update-attendance/sidenav/left/batch-update-attendance-sidenav/batch-update-attendance-sidenav.component';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzBadgeModule } from 'ng-zorro-antd/badge';


@NgModule({
    declarations: [
        ChildrenAttendanceReportComponent,
        SetAttendanceTimeComponent,
        BatchUpdateAttendanceComponent,
        BatchUpdateAttendanceChildListSidenavComponent,
    ],
    imports: [
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
        NzRadioModule,
        NzSelectModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzDropDownModule,
        NzDatePickerModule,
        NzTableModule,
        NzCheckboxModule,
        NzSkeletonModule,
        NzAvatarModule,
        NzDividerModule,
        NzListModule,
        NzBadgeModule,

        FuseSidebarModule
    ],
    exports: [
        ChildrenAttendanceReportComponent,
        SetAttendanceTimeComponent,
        BatchUpdateAttendanceComponent,
        BatchUpdateAttendanceChildListSidenavComponent
    ],
    providers: [
        
    ]
})

export class AttendanceSharedModule { }

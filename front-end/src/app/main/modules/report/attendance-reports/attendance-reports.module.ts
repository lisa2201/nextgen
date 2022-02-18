import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzStatisticModule, NzToolTipModule, NzBadgeModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { ReactiveFormsModule } from '@angular/forms';
import { AttendanceReportFilterComponent } from './report-filter/report-filter.component';
import { AttendanceReportListViewComponent } from './report-list-view/report-list-view.component';
import { ContactReportservice } from '../service/contact-report.service';
import { ChildrenService } from '../../child/services/children.service';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { RoomService } from '../../room/services/room.service';
import { AttendanceReportsComponent } from './attendance-reports.component';
import { AttendanceReportservice } from '../service/attendance-report.service';
import { ReportDependencyervice } from '../service/report-dependencey.service';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { ConvertNumberToTimeStringPipe } from 'app/shared/pipes/convert-number-to-12-hours.pipe';
import { OrderByPipe } from 'ngx-pipes';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: AttendanceReportsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N52',
            permissions: ['AC0'],
            title: 'Attendance Reports'
        },
        resolve: {
            resolveData: AttendanceReportservice
        }
    },
];

@NgModule({
    declarations: [
        AttendanceReportListViewComponent,
        AttendanceReportFilterComponent,
        AttendanceReportsComponent,
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        TranslateModule,
        ReactiveFormsModule,

        FlexLayoutModule,

        NzDividerModule,
        NzFormModule,
        NzInputModule,
        NzTableModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzSelectModule,
        NzCheckboxModule,
        NzSwitchModule,
        NzGridModule,
        NzRadioModule,
        NzTagModule,
        NzDatePickerModule,
        NzStatisticModule,
        NzToolTipModule,
        NzDropDownModule,
        NzBadgeModule,
        NzSpinModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatMenuModule,
        NgxChartsModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule
    ],
    providers: [
        ChildrenService,
        RoomService,
        AttendanceReportservice,
        ReportDependencyervice,
        ConvertNumberToTimeStringPipe,
        OrderByPipe

    ]
})
export class AttendanceReportsModule { }

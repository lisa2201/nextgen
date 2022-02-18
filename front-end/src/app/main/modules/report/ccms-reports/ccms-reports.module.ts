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
import { ContactReportservice } from '../service/contact-report.service';
import { ChildrenService } from '../../child/services/children.service';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { RoomService } from '../../room/services/room.service';
import { AttendanceReportservice } from '../service/attendance-report.service';
import { ReportDependencyervice } from '../service/report-dependencey.service';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { CCMSReportsComponent } from './ccms-reports.component';
import { CCMSReportListViewComponent } from './report-list-view/report-list-view.component';
import { CCMSReportFilterComponent } from './report-filter/report-filter.component';
import { MatInputModule } from '@angular/material/input';
import { MatRippleModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';

import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { CCMSReportservice } from '../service/ccms-report.service';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: CCMSReportsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N52',
            permissions: ['AC0'],
            title: 'CCS/CCMS Reports'
        },
        resolve: {
            resolveData: CCMSReportservice
        }
    },
];

@NgModule({
    declarations: [
        CCMSReportListViewComponent,
        CCMSReportFilterComponent,
        CCMSReportsComponent,
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

        MatChipsModule,
        MatExpansionModule,
        MatInputModule,
        MatPaginatorModule,
        MatRippleModule,
        MatSelectModule,
        MatSortModule,
        MatSnackBarModule,
        MatTableModule,
        MatTabsModule,

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
        CCMSReportservice

    ]
})
export class CCMSReportsModule { }

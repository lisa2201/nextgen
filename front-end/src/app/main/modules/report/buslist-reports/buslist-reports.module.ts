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
import { BuslistReportFilterComponent } from './report-filter/report-filter.component';
import { BuslistReportListViewComponent } from './report-list-view/report-list-view.component';
import { ContactReportservice } from '../service/contact-report.service';
import { ChildrenService } from '../../child/services/children.service';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { RoomService } from '../../room/services/room.service';
import { BuslistReportsComponent } from './buslist-reports.component';
import { ReportDependencyervice } from '../service/report-dependencey.service';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import {BuslistReportService} from '../service/buslist-report.service';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: BuslistReportsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N59',
            permissions: ['AC0'],
            title: 'Buslist Reports'
        },
        resolve: {
            resolveData: BuslistReportService
        }
    },
];

@NgModule({
    declarations: [
        BuslistReportListViewComponent,
        BuslistReportFilterComponent,
        BuslistReportsComponent,
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
        BuslistReportService,
        ReportDependencyervice

    ]
})
export class BuslistReportsModule { }

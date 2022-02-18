import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzStatisticModule, NzToolTipModule, NzBadgeModule, NzListModule, NzSkeletonModule, NzCardModule } from 'ng-zorro-antd';
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
import { ContactReportsComponent } from './contact-reports.component';
import { ReportFilterComponent } from './report-filter/report-filter.component';
import { ReportListViewComponent } from './report-list-view/report-list-view.component';
import { ContactReportservice } from '../service/contact-report.service';
import { ChildrenService } from '../../child/services/children.service';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { RoomService } from '../../room/services/room.service';
import { ReportDependencyervice } from '../service/report-dependencey.service';
import { ReportSideNavComponent } from '../shared/report-side-nav/report-side-nav.component';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: ContactReportsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N52',
            permissions: ['AC0'],
            title: 'Contact Reports'
        },
        resolve: {
            resolveData: ContactReportservice
        }
    },
];

@NgModule({
    declarations: [
        ContactReportsComponent,
        ReportFilterComponent,
        ReportListViewComponent,
        ReportSideNavComponent
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
        NzListModule,
        NzSkeletonModule,
        NzCardModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatMenuModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule
    ],
    providers: [
        ContactReportservice,
        ChildrenService,
        RoomService,
        ReportDependencyervice

    ]
})
export class ContactReportsModule { }

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportThemeSelectComponent } from './report-theme-select/report-theme-select.component';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzDatePickerModule, NzStatisticModule, NzToolTipModule, NzDropDownModule, NzBadgeModule, NzSpinModule } from 'ng-zorro-antd';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';


const APP_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'contact',
        pathMatch: 'full'
    },
    {
        path: 'contact',
        loadChildren: () => import('./contact-reports/contact-reports.module').then(m => m.ContactReportsModule)
    },
    {
        path: 'attendance',
        loadChildren: () => import('./attendance-reports/attendance-reports.module').then(m => m.AttendanceReportsModule)
    },
    {
        path: 'buslist',
        loadChildren: () => import('./buslist-reports/buslist-reports.module').then(m => m.BuslistReportsModule)
    },
    {
        path: 'ccms-report',
        loadChildren: () => import('./ccms-reports/ccms-reports.module').then(m => m.CCMSReportsModule)
    },
    {
        path: 'financial',
        loadChildren: () => import('./finance-report/finance-reports.module').then(m => m.FinanceReportsModule)
    },
    {
        path: 'medical-report',
        loadChildren: () => import('./immunisation-report/immunisation-report.module').then(m => m.ImmunisationReportsModule)
    },
    {
        path: 'other-report',
        loadChildren: () => import('./immunisation-report/immunisation-report.module').then(m => m.ImmunisationReportsModule)
    }
];
@NgModule({
    declarations: [
        ReportThemeSelectComponent,
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

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule,
    ],

})

export class ReportModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzStatisticModule, NzToolTipModule, NzBadgeModule, NzListModule, NzAvatarModule } from 'ng-zorro-antd';
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
import { FinanceReportservice } from '../service/finance-report.service';
import { BondPaymentservice } from '../../finance/bond-payment/service/bond-payment.service';
import { ReportDependencyervice } from '../service/report-dependencey.service';
import { ImmunisationReportComponent } from './immunisation-report.component';
import { ImmunisationReportListViewComponent } from './immunisation-report-list-view/immunisation-report-list-view.component';
import { ImmunisationReportFilterComponent } from './immunisation-report-filter/immunisation-report-filter.component';
import { ImmunisationReportservice } from '../service/immunisation-report.service';
import { FinanceService } from '../../finance/shared/services/finance.service';
import { TooltipModule } from 'ng2-tooltip-directive';
import { ImmunisationTrackingModule } from '../../child/immunisation-tracking/immunisation-tracking.module';


const APP_ROUTES: Routes = [
    {
        path: '',
        component: ImmunisationReportComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N52',
            permissions: ['AC0'],
            title: 'Medical Reports'
        },
        resolve: {
            resolveData: ImmunisationReportservice
        }
    },
];

@NgModule({
    declarations: [
        ImmunisationReportComponent,
        ImmunisationReportListViewComponent,
        ImmunisationReportFilterComponent
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
        NzAvatarModule,
        TooltipModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatMenuModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule,
        ImmunisationTrackingModule
    ],
    providers: [
        ImmunisationReportservice,
        FinanceService

    ]
})
export class ImmunisationReportsModule { }

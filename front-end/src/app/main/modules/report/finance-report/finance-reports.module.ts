import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzStatisticModule, NzToolTipModule, NzBadgeModule, NzAlertModule, NzDescriptionsModule } from 'ng-zorro-antd';
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
import { FinanceReportComponent } from './finance-report.component';
import { FinanceReportservice } from '../service/finance-report.service';
import { BondPaymentservice } from '../../finance/bond-payment/service/bond-payment.service';
import { ReportDependencyervice } from '../service/report-dependencey.service';
import { FinanceReportUserFilterRightSidenavComponent } from './sidenavs/right/finance-report-user-filter-right-sidenav.component';
import { AccountBalanceReportComponent } from './components/account-balance-report/account-balance-report.component';
import { AgedDebtorsReportComponent } from './components/aged-debtors-report/aged-debtors-report.component';
import { IncomeSummaryReportComponent } from './components/income-summary-report/income-summary-report.component';
import { TransactionSummaryReportComponent } from './components/transaction-summary-report/transaction-summary-report.component';
import { WeeklyRevenueSummaryReportComponent } from './components/weekly-revenue-summary-report/weekly-revenue-summary-report.component';
import { BondReportComponent } from './components/bond-report/bond-report.component';
import { OpeningBalanceReportComponent } from './components/opening-balance-report/opening-balance-report.component';
import { FinancialAdjustmentsReportComponent } from './components/financial-adjustments-report/financial-adjustments-report.component';
import { ProjectedWeeklyRevenueSummaryReportComponent } from './components/projected-weekly-revenue-summary-report/projected-weekly-revenue-summary-report.component';
import { GapFeeReportComponent } from './components/gap-fee-report/gap-fee-report.component';
import { BankingSummaryReportComponent } from './components/banking-summary-report/banking-summary-report.component';


const APP_ROUTES: Routes = [
    {
        path: '',
        component: FinanceReportComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N52',
            permissions: ['AC0'],
            title: 'Finance Reports'
        },
        resolve: {
            resolveData: FinanceReportservice
        }
    },
];

@NgModule({
    declarations: [
        FinanceReportComponent,
        FinanceReportUserFilterRightSidenavComponent,
        AccountBalanceReportComponent,
        AgedDebtorsReportComponent,
        IncomeSummaryReportComponent,
        TransactionSummaryReportComponent,
        WeeklyRevenueSummaryReportComponent,
        BondReportComponent,
        OpeningBalanceReportComponent,
        FinancialAdjustmentsReportComponent,
        ProjectedWeeklyRevenueSummaryReportComponent,
        GapFeeReportComponent,
        BankingSummaryReportComponent,
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
        NzAlertModule,
        NzDescriptionsModule,

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
    providers: [
        FinanceReportservice,
        ChildrenService,
        RoomService,
        BondPaymentservice,
        ContactReportservice,
        ReportDependencyervice

    ]
})
export class FinanceReportsModule { }

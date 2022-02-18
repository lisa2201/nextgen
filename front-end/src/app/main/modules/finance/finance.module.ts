import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FinanceComponent } from './finance.component';
import { Routes, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FuseSharedModule } from '@fuse/shared.module';
import { AddFinancialAdjustmentDialogComponent } from './shared/dialogs/add-financial-adjustment-dialog/add-financial-adjustment-dialog.component';
import { FinanceService } from './shared/services/finance.service';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzListModule, NzBadgeModule, NzStatisticModule, NzSpinModule, NzDescriptionsModule, NzToolTipModule, NzAlertModule } from 'ng-zorro-antd';
import { ParentStatementPreviewViewComponent } from './shared/dialogs/parent-statement-preview-view/parent-statement-preview-view.component';
import { OneTimeScheduledPaymentDialogComponent } from './shared/dialogs/one-time-scheduled-payment-dialog/one-time-scheduled-payment-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FinanceAddManualPaymentComponent } from './shared/dialogs/finance-add-manual-payment/finance-add-manual-payment.component';
import { GenerateEntitlementStatementDialogComponent } from './shared/dialogs/generate-entitlement-statement-dialog/generate-entitlement-statement-dialog.component';
import { GenerateParentStatementDialogComponent } from './shared/dialogs/generate-parent-statement-dialog/generate-parent-statement-dialog.component';
import { FinancialPaymentDetailsDialogComponent } from './shared/dialogs/financial-payment-details-dialog/financial-payment-details-dialog.component';
import { AddParentFinancialExclusionDialogComponent } from './shared/dialogs/add-parent-financial-exclusion-dialog/add-parent-financial-exclusion-dialog.component';
import { ParentPaymentScheduleDetailDialogComponent } from './shared/dialogs/parent-payment-schedule-detail-dialog/parent-payment-schedule-detail-dialog.component';
import { ParentPaymentScheduleEditDialogComponent } from './shared/dialogs/parent-payment-schedule-edit-dialog/parent-payment-schedule-edit-dialog.component';
import { WaiveFeeDialogComponent } from './shared/dialogs/waive-fee-dialog/waive-fee-dialog.component';
import { TooltipModule } from 'ng2-tooltip-directive';
import { WaiveTransactionDetailDialogComponent } from './shared/dialogs/waive-fee-dialog/waive-transaction-detail-dialog/waive-transaction-detail-dialog.component';
import { BulkToggleAutoChargeDialogComponent } from './shared/dialogs/bulk-toggle-auto-charge-dialog/bulk-toggle-auto-charge-dialog.component';

const APP_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'financial-statements',
        pathMatch: 'full'
    },
    {
        path: 'finance-accounts',
        loadChildren: () => import('./finance-accounts/finance-accounts.module').then(m => m.FinanceAccountsModule)
    },
    {
        path: 'financial-statements',
        loadChildren: () => import('./financial-statements/financial-statements.module').then(m => m.FinancialStatementsModule)
    },
    {
        path: 'financial-adjustments',
        loadChildren: () => import('./financial-adjustments/financial-adjustments.module').then(m => m.FinancialAdjustmentsModule)
    },
    {
        path: 'balance-adjustments',
        loadChildren: () => import('./balance-adjustments/balance-adjustments.module').then(m => m.BalanceAdjustmentsModule)
    },
    {
        path: 'finance-account-transactions',
        loadChildren: () => import('./finance-account-transactions/finance-account-transactions.module').then(m => m.FinanceAccountTransactionsModule)
    },
    {
        path: 'finance-account-payments',
        loadChildren: () => import('./finance-account-payments/finance-account-payments.module').then(m => m.FinanceAccountPaymentsModule)
    },
    {
        path: 'finance-payment-methods',
        loadChildren: () => import('./parent-payment-method/parent-payment-method.module').then(m => m.ParentPaymentMethodModule)
    },
    {
        path: 'bond-payments',
        loadChildren: () => import('./bond-payment/bond-payment.module').then(m => m.BondPaymentModule)
    },
    {
        path: 'payment-terms',
        loadChildren: () => import('./payment-terms/payment-terms.module').then(m => m.PaymentTermsModule)
    },
    {
        path: 'petty-cash',
        loadChildren: () => import('./petty-cash/petty-cash.module').then(m => m.PettyCashModule)
    }
    
];

@NgModule({
    declarations: [
        FinanceComponent,
        AddFinancialAdjustmentDialogComponent,
        ParentStatementPreviewViewComponent,
        OneTimeScheduledPaymentDialogComponent,
        FinanceAddManualPaymentComponent,
        GenerateEntitlementStatementDialogComponent,
        GenerateParentStatementDialogComponent,
        FinancialPaymentDetailsDialogComponent,
        AddParentFinancialExclusionDialogComponent,
        ParentPaymentScheduleDetailDialogComponent,
        ParentPaymentScheduleEditDialogComponent,
        WaiveFeeDialogComponent,
        WaiveTransactionDetailDialogComponent,
        BulkToggleAutoChargeDialogComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        ReactiveFormsModule,
        
        FlexLayoutModule,

        NzDatePickerModule,
        NzDividerModule,
        NzFormModule,
        NzInputModule,
        NzTableModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzSelectModule,
        NzGridModule,
        NzListModule,
        NzBadgeModule,
        NzTagModule,
        NzStatisticModule,
        NzSpinModule,
        NzDescriptionsModule,
        NzCheckboxModule,
        NzToolTipModule,
        NzAlertModule,
        NzSwitchModule,

        MatTabsModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        KM8SharedModule,
        TooltipModule,

        FuseSharedModule
    ],
    providers: [
        FinanceService,
        TitleCasePipe
    ]
})
export class FinanceModule { }

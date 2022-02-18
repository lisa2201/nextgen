import { NgModule } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FinanceAccountsComponent } from './finance-accounts.component';
import { FinanceAccountsListViewComponent } from './finance-accounts-list-view/finance-accounts-list-view.component';
import { FinanceAccountsLeftSidenavComponent } from './sidenavs/left/finance-accounts-left-sidenav/finance-accounts-left-sidenav.component';
import { FinanceAccountsService } from './services/finance-accounts.service';
import { FinanceAccountsListResolverService } from './services/finance-accounts-list-resolver.service';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzStatisticModule, NzToolTipModule, NzAlertModule, NzDropDownModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { FinancePaymentSettingsComponent } from './finance-payment-settings/finance-payment-settings.component';
import { FinancePaymentSettingsResolverService } from './services/finance-payment-settings-resolver.service';
import { ReactiveFormsModule } from '@angular/forms';
import { FinanceParentExclusionsSettingsComponent } from './finance-payment-settings/finance-parent-exclusions-settings/finance-parent-exclusions-settings.component';
import { TooltipModule } from 'ng2-tooltip-directive';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: FinanceAccountsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N40',
            permissions: ['AC0'],
            title: 'Parent Accounts'
        },
        resolve: {
            resolveData: FinanceAccountsListResolverService
        }
    },
    {
        path: 'finance-account-payment-settings/:id',
        component: FinancePaymentSettingsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N40',
            permissions: ['AC0'],
            title: 'Account Payment Settings'
        },
        resolve: {
            resolveData: FinancePaymentSettingsResolverService
        }
    },
    {
        path: 'finance-payment-methods',
        loadChildren: () => import('../parent-payment-method/parent-payment-method.module').then(m => m.ParentPaymentMethodModule)
    }
];

@NgModule({
    declarations: [
        FinanceAccountsComponent,
        FinanceAccountsListViewComponent,
        FinanceAccountsLeftSidenavComponent,
        FinancePaymentSettingsComponent,
        FinanceParentExclusionsSettingsComponent,
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
        NzAlertModule,
        NzDropDownModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatMenuModule,

        TooltipModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule
    ],
    providers: [
        FinanceAccountsService,
        FinanceAccountsListResolverService,
        FinancePaymentSettingsResolverService,
        CurrencyPipe
    ]
})
export class FinanceAccountsModule { }

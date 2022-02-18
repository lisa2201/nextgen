import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceAccountTransactionsComponent } from './finance-account-transactions.component';
import { FinanceAccountTransactionsLeftSidenavComponent } from './sidenavs/left/finance-account-transactions-left-sidenav/finance-account-transactions-left-sidenav.component';
import { FinanceAccountTransactionsListViewComponent } from './finance-account-transactions-list-view/finance-account-transactions-list-view.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzDatePickerModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FinanceAccountTransactionListResolverService } from './services/finance-account-transaction-list-resolver.service';
import { FinanceAccountTransactionService } from './services/finance-account-transaction.service';
import { ReactiveFormsModule } from '@angular/forms';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: FinanceAccountTransactionsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N46',
            permissions: ['AC0'],
            title: 'Account Transactions'
        },
        resolve: {
            resolveData: FinanceAccountTransactionListResolverService
        }
    }
];

@NgModule({
    declarations: [
        FinanceAccountTransactionsComponent, 
        FinanceAccountTransactionsLeftSidenavComponent, 
        FinanceAccountTransactionsListViewComponent
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
        NzDatePickerModule,
        NzTagModule,

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
        FinanceAccountTransactionService,
        FinanceAccountTransactionListResolverService
    ]
})
export class FinanceAccountTransactionsModule { }

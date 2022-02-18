import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceAccountPaymentsComponent } from './finance-account-payments.component';
import { FinanceAccountPaymentsListViewComponent } from './finance-account-payments-list-view/finance-account-payments-list-view.component';
import { FinanceAccountPaymentsLeftSidenavComponent } from './sidenavs/left/finance-account-payments-left-sidenav/finance-account-payments-left-sidenav.component';
import { FinanceAccountPaymentsService } from './services/finance-account-payments.service';
import { FinanceAccountPaymentsListResolverService } from './services/finance-account-payments-list-resolver.service';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzDatePickerModule, NzAlertModule, NzToolTipModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { FinanceAccountPaymentAdjustDialogComponent } from './dialogs/finance-account-payment-adjust-dialog/finance-account-payment-adjust-dialog.component';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: FinanceAccountPaymentsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N43',
            permissions: ['AC0'],
            title: 'Parent Payments'
        },
        resolve: {
            resolveData: FinanceAccountPaymentsListResolverService
        }
    }
];

@NgModule({
    declarations: [
        FinanceAccountPaymentsComponent, 
        FinanceAccountPaymentsListViewComponent, 
        FinanceAccountPaymentsLeftSidenavComponent, 
        FinanceAccountPaymentAdjustDialogComponent
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
        NzAlertModule,
        NzToolTipModule,

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
        FinanceAccountPaymentsService,
        FinanceAccountPaymentsListResolverService
    ]
})
export class FinanceAccountPaymentsModule { }

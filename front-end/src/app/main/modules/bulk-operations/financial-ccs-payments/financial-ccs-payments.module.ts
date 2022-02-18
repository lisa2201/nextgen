import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialCcsPaymentsComponent } from './financial-ccs-payments.component';
import { FinancialCcsPaymentsListViewComponent } from './financial-ccs-payments-list-view/financial-ccs-payments-list-view.component';
import { FinancialCcsPaymentsLeftSidenavComponent } from './sidenavs/left/financial-ccs-payments-left-sidenav/financial-ccs-payments-left-sidenav.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzDatePickerModule, NzDescriptionsModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FinancialCcsPaymentsService } from './services/financial-ccs-payments.service';
import { FinancialCcsPaymentsListResolver } from './services/financial-ccs-payments-list-resolver.service';
import { CcsPaymentDetailDialogComponent } from './dialogs/ccs-payment-detail-dialog/ccs-payment-detail-dialog.component';


const APP_ROUTES: Routes = [
    {
        path: '',
        component: FinancialCcsPaymentsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N22',
            permissions: ['AC0'],
            title: 'Manage CCS Payments'
        }
    }
];

@NgModule({
    declarations: [
        FinancialCcsPaymentsComponent,
        FinancialCcsPaymentsListViewComponent,
        FinancialCcsPaymentsLeftSidenavComponent,
        CcsPaymentDetailDialogComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        TranslateModule,

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
        NzDescriptionsModule,

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
        FinancialCcsPaymentsService,
        FinancialCcsPaymentsListResolver
    ]
})
export class FinancialCcsPaymentsModule { }

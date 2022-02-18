import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BalanceAdjustmentsListViewComponent } from './balance-adjustments-list-view/balance-adjustments-list-view.component';
import { BalanceAdjustmentsLeftSidenavComponent } from './sidenavs/left/balance-adjustments-left-sidenav/balance-adjustments-left-sidenav.component';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzAlertModule } from 'ng-zorro-antd';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BalanceAdjustmentsComponent } from './balance-adjustments.component';
import { AddBalanceAdjustmentDialogComponent } from './dialogs/add-balance-adjustment-dialog/add-balance-adjustment-dialog.component';
import { BalanceAdjustmentsListResolverService } from './services/balance-adjustments-list-resolver.service';
import { BalanceAdjustmentsService } from './services/balance-adjustments.service';
import { ReactiveFormsModule } from '@angular/forms';

const APP_ROUTES: Routes = [
  {
    path: '',
    component: BalanceAdjustmentsComponent,
    canActivate: [
      AuthGuard
    ],
    data:
    {
      belongsTo: 'N35',
      permissions: ['AC0'],
      title: 'Opening Balance'
    },
    resolve: {
      resolveData: BalanceAdjustmentsListResolverService
    }
  }
];

@NgModule({
  declarations: [BalanceAdjustmentsComponent,
    BalanceAdjustmentsListViewComponent,
    BalanceAdjustmentsLeftSidenavComponent,
    AddBalanceAdjustmentDialogComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(APP_ROUTES),
    TranslateModule,
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
    NzCheckboxModule,
    NzSwitchModule,
    NzGridModule,
    NzRadioModule,
    NzAlertModule,

    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,

    FuseSidebarModule,
    FuseSharedModule,

    KM8SharedModule
  ],
  providers: [
      BalanceAdjustmentsService,
      BalanceAdjustmentsListResolverService
  ]
})
export class BalanceAdjustmentsModule { }

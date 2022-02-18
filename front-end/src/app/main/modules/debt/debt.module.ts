import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebtComponent } from './debt.component';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { DebtSidenavComponent } from './sidenav/debt-sidenav/debt-sidenav.component';
import { FuseSidebarModule } from '@fuse/components';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NzFormModule, NzSelectModule, NzEmptyModule, NzButtonModule, NzIconModule, NzRadioModule, NzInputModule, NzCheckboxModule, NzDropDownModule, NzTableModule, NzDividerModule, NzModalModule, NzSwitchModule, NzSpinModule, NzGridModule, NzAlertModule, NzSkeletonModule, NzListModule, NzCardModule, NzUploadModule } from 'ng-zorro-antd';
import { InvitationService } from '../invitation/services/invitation.service';
import { BranchService } from '../branch/services/branch.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { DebtService } from './services/debt.service';
import { ApaSidenavComponent } from './sidenav/apa-sidenav/apa-sidenav.component';
import { ApaListViewComponent } from './list-view/apa-list-view/apa-list-view.component';
import { DebtListViewComponent } from './list-view/debt-list-view/debt-list-view.component';
import { ApaNewOrEditComponent } from './apa-new-or-edit/apa-new-or-edit.component';
import { RyTimePickerModule } from 'app/shared/components';
import { TooltipModule } from 'ng2-tooltip-directive';
import { AccountManagerService } from '../account-manager/account-manager.service';

const routes = [
  {
    path: '',
    component: DebtComponent,
    canActivate:
      [
        AuthGuard
      ],
    data:
    {
      belongsTo: 'N38',
      permissions: ['AC0']
    },
    resolve:
    {
      DebtData: DebtService
    }
  }]

@NgModule({
  declarations: [
    DebtComponent,
    DebtSidenavComponent,
    DebtListViewComponent,
    ApaSidenavComponent,
    ApaListViewComponent,
    ApaNewOrEditComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),

    TranslateModule,

    FuseSharedModule,
    KM8SharedModule,

    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTabsModule,
    RyTimePickerModule,

    NzFormModule,
    NzSelectModule,
    NzSpinModule,
    NzEmptyModule,
    NzButtonModule,
    NzIconModule,
    NzRadioModule,
    NzInputModule,
    NzCheckboxModule,
    NzDropDownModule,
    NzTabsModule,
    NzGridModule,
    NzSwitchModule,
    NzTableModule,
    NzDatePickerModule,
    NzModalModule,
    NzAlertModule,
    NzSkeletonModule,
    NzListModule,
    NzCardModule,
    NzDividerModule,
    NzUploadModule,
    FuseSidebarModule,

    TooltipModule
  ],
  providers: [
    DebtService,
    BranchService,
    InvitationService,
    AccountManagerService
  ],
})
export class DebtModule { }

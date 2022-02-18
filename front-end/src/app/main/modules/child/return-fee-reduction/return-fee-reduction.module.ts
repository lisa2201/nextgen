import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReturnFeeReductionComponent } from './return-fee-reduction.component';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { ReturnFeeReductionService } from './services/return-fee-reduction.service';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { RyTimePickerModule } from 'app/shared/components';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { FuseSidebarModule } from '@fuse/components';
import { TooltipModule } from 'ng2-tooltip-directive';
import { AddOrEditComponent } from './dialogs/add-or-edit/add-or-edit.component';
import { ListViewComponent } from './list-view/list-view.component';
import { CancleReturnFeeComponent } from './dialogs/add-or-edit/cancle-return-fee/cancle-return-fee.component';
import {NzAvatarModule} from 'ng-zorro-antd/avatar';

const routes = [
  {
      path: 'return-fee-reduction',
      component: ReturnFeeReductionComponent,
      canActivate: [
          AuthGuard
      ],
      data:
      {
          belongsTo: 'N37',
          permissions: ['AC0'],
          title: 'Child - Return Fee Reduction'
      },
      resolve:
      {
          resolveData: ReturnFeeReductionService
      }
  }
];

@NgModule({
  declarations: [ReturnFeeReductionComponent, AddOrEditComponent, ListViewComponent, CancleReturnFeeComponent],
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

    FuseSidebarModule,

    TooltipModule,
    NzAvatarModule
  ],
  providers: [
    ReturnFeeReductionService
  ],
})
export class ReturnFeeReductionModule { }

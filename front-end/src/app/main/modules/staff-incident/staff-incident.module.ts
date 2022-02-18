import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { ConvertNumberToTimeStringPipe } from 'app/shared/pipes/convert-number-to-12-hours.pipe';
import { S3UploadModule } from 'app/shared/components';
import { FuseSidebarModule } from '@fuse/components';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { SignaturePadModule } from 'angular2-signaturepad';

import { StaffIncidentComponent } from './staff-incident.component';
import { NewOrEditComponent } from './dialogs/new-or-edit/new-or-edit.component';
import { NewOrEditWebviewComponent } from './new-or-edit-webview/new-or-edit-webview.component';
import { ListViewComponent } from './list-view/list-view.component';
import { ViewIncidentComponent } from './dialogs/view-incident/view-incident.component';
import { SidenavComponent } from './sidenav/sidenav.component';

import { StaffIncidentService } from './services/staff-incident.service';
import { StaffIncidentWebviewService } from './services/staff-incident-webview.service';

import { FuseSharedModule } from '@fuse/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { KM8SharedModule } from 'app/shared/shared.module';
import { DynamicModule } from 'ng-dynamic-component';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzBadgeModule } from 'ng-zorro-antd/badge';

const routes = [
  {
    path: '',
    component: StaffIncidentComponent,
    canActivate: [AuthGuard],
    data: {
      belongsTo: 'N71',
      permissions: ['AC0'],
    },
    resolve: {
      staffIncident: StaffIncidentService,
    },

  },
  {
    path: 'incident/new',
    component: NewOrEditWebviewComponent,
    canActivate: [AuthGuard],
    data: {
      belongsTo: 'N71',
      permissions: ['AC1'],
      type: 'create'
    }
  },
  {
    path: 'incident/:id',
    component: NewOrEditWebviewComponent,
    canActivate: [AuthGuard],
    data: {
      belongsTo: 'N71',
      permissions: ['AC2'],
      type: 'edit'
    },
    resolve: {
      staffIncident: StaffIncidentWebviewService,
    }
  },
];

@NgModule({
  declarations: [StaffIncidentComponent, NewOrEditComponent, ListViewComponent, ViewIncidentComponent, SidenavComponent, NewOrEditWebviewComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    RyTimePickerModule,
    MatDialogModule,
    NzFormModule,
    NzSelectModule,
    NzInputModule,
    NzCheckboxModule,
    NzDropDownModule,
    NzPaginationModule,
    NzTableModule,
    NzEmptyModule,
    NzButtonModule,
    NzDatePickerModule,
    NzDividerModule,
    S3UploadModule,
    FuseSidebarModule,
    NzUploadModule,
    SignaturePadModule,

    TranslateModule,
    FuseSharedModule,
    KM8SharedModule,
    MatFormFieldModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    NzSpinModule,
    NzCardModule,
    NzListModule,
    NzIconModule,
    // NzRadioModule,        
    NzTabsModule,
    NzGridModule,
    // NzSwitchModule,
    NzBadgeModule,
    // NzAlertModule,
    DynamicModule.forRoot()
  ],
  providers: [
    StaffIncidentService,
    StaffIncidentWebviewService,
    ConvertNumberToTimeStringPipe
  ]
})
export class StaffIncidentModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PincodeComponent } from './pincode.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzGridModule, NzModalModule } from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { PincodeService } from './services/pincode.service';


const routes: Routes = [
  {
      path: '',
      component: PincodeComponent,
      canActivate: [
          AuthGuard
      ],
      data: {
          belongsTo: 'N42',
          permissions: ['AC0']
      },
      resolve:
      {
        resolveData: PincodeService
      }
  }
];

@NgModule({
  declarations: [
    PincodeComponent
],
imports: [
    CommonModule,
    RouterModule.forChild(routes),

    FlexLayoutModule,

    NzFormModule,
    NzInputModule,
    NzTableModule,
    NzEmptyModule,
    NzButtonModule,
    NzIconModule,
    NzGridModule,
    NzModalModule,

    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,

    FuseSidebarModule,
    FuseSharedModule,

    KM8SharedModule
],
providers: [
]
})
export class PincodeModule { }

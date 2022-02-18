import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EducatorRatioComponent } from './educator-ratio.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
    NzFormModule,
    NzInputModule,
    NzTableModule,
    NzEmptyModule,
    NzButtonModule,
    NzIconModule,
    NzGridModule,
    NzModalModule,
    NzCheckboxModule
} from 'ng-zorro-antd';
import { MatToolbarModule,  } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { EducatorRatioService } from './services/educator-ratio.service';
import {NzSelectModule} from 'ng-zorro-antd/select';


const routes: Routes = [
  {
      path: '',
      component: EducatorRatioComponent,
      canActivate: [
          AuthGuard
      ],
      data: {
          belongsTo: 'N42',
          permissions: ['AC0'],
          title: 'Center Wise Educator Ratio'
      },
      resolve:
      {
        resolveData: EducatorRatioService
      }
  }
];

@NgModule({
  declarations: [
    EducatorRatioComponent
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
    NzSelectModule,


    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,

    FuseSidebarModule,
    FuseSharedModule,

    KM8SharedModule,
    NzCheckboxModule
],
providers: [
]
})
export class EducatorRatioModule { }

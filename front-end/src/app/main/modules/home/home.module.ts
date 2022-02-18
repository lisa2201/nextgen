import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { HomeComponent } from './home.component';

import { KM8SharedModule } from 'app/shared/shared.module';

import { TooltipModule } from 'ng2-tooltip-directive';

import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { FuseWidgetModule } from '@fuse/components/widget/widget.module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';

import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzSpinModule } from 'ng-zorro-antd';

import { ParentBookingsWidgetModule } from '../widgets/parent-widgets/parent-booking/parent-bookings-widget.module';
import { AttendanceYtdWidgetModule } from '../widgets/parent-widgets/attendance/attendance-ytd-widget.module';

const routes = [
    {
        path: '',
        canActivate: [AuthGuard],
        component: HomeComponent,
        data: {
            belongsTo: 'N11',
            permissions: ['AC0'],
            title: 'Home'
        }
    }
];

@NgModule({
    declarations: [
        HomeComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,
        FuseSharedModule,
        TranslateModule,

        FuseSharedModule,
        FuseWidgetModule,
        FuseSharedModule,
        MatFormFieldModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,
        NzGridModule,
        NzSelectModule,
        NzTagModule,       
        KM8SharedModule,
        TooltipModule,
        NzUploadModule,
        NzButtonModule,
        NzIconModule,
        NzDropDownModule,
        NzSpinModule,

        AttendanceYtdWidgetModule,
        ParentBookingsWidgetModule
    ]
})

export class HomeModule { }

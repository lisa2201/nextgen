import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { KM8SharedModule } from 'app/shared/shared.module';

import { FuseSharedModule } from '@fuse/shared.module';

import { NgxCaptchaModule } from 'ngx-captcha';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NgNumericKeyboardModule, NumericInputModule } from 'ng-numeric-keyboard';
import { RouteGuard } from 'app/shared/guard/route.guard';
import { FormatTimePipe, KisokSetupComponent } from './kisok-setup.component';
import { KisokService } from './service/kisok.service';
import { BrowserModule } from '@angular/platform-browser';
import { NzAvatarModule, NzListModule, NzPageHeaderModule, NzSkeletonModule } from 'ng-zorro-antd';
import { CreateAttendenceComponent } from './dialog/create-attendence/create-attendence.component';
import {SetBookingComponent} from './dialog/set-booking/set-booking.component';
import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';
import { GetMissedAttendanceComponent } from './dialog/get-missed-attendance/get-missed-attendance.component';



const routes = [
    {
        path: 'kiosk',
        canActivate: [
            RouteGuard
        ],
        component: KisokSetupComponent,
        resolve:
        {
            kisok: KisokService
        }
    }
];

@NgModule({
    declarations: [
        KisokSetupComponent,
        CreateAttendenceComponent,
        SetBookingComponent,
        GetMissedAttendanceComponent,
        FormatTimePipe
    ],
    imports: [
        RouterModule.forChild(routes),

        FuseSharedModule,
        KM8SharedModule,

        MatDialogModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,

        NzButtonModule,
        NzInputModule,
        NzCheckboxModule,
        NzFormModule,
        NzDatePickerModule,
        NzAvatarModule,
        NzListModule,
        NzSkeletonModule,
        NzPageHeaderModule,
        NzRadioModule,
        RyTimePickerModule,

        NgxCaptchaModule,
        NgNumericKeyboardModule,
        NumericInputModule,
        BrowserModule
        
    ],
    providers: [
        KisokService
    ]
})
export class KisokSetupModule {
}

import { NgModule } from '@angular/core';
import { BookingRequestComponent } from './booking-request.component';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

import { RyTimePickerModule } from 'app/shared/components';
import { NzFormModule, NzSelectModule, NzSpinModule, NzEmptyModule, NzButtonModule, NzIconModule, NzRadioModule, NzInputModule, NzCheckboxModule, NzDropDownModule, NzTabsModule, NzGridModule, NzSwitchModule, NzTableModule, NzDatePickerModule, NzModalModule, NzAlertModule, NzSkeletonModule, NzListModule, NzCardModule, NzDividerModule } from 'ng-zorro-antd';
import { FuseSidebarModule } from '@fuse/components';
import { TooltipModule } from 'ng2-tooltip-directive';
import { BookingRequestService } from './services/booking-request.service';
import {NzAvatarModule} from 'ng-zorro-antd/avatar';

const routes = [
    {
        path: 'booking-request',
        component: BookingRequestComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N26',
            permissions: ['AC0'],
            title: 'Child - Booking Request'
        },
        resolve:
        {
            bookingRequests: BookingRequestService
        }
    }
];

@NgModule({
    declarations: [
        BookingRequestComponent
    ],
    imports: [
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
        BookingRequestService
    ],
})
export class BookingRequestModule { }

import { NgModule } from '@angular/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { RyTimePickerModule } from 'app/shared/components';
import { FuseSidebarModule } from '@fuse/components';

import { NgProgressModule } from 'ngx-progressbar';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { BookingRequestService } from './services/booking-request.service';

import { BookingRequestViewComponent } from './dialogs/booking-request.component';
import { BookingRequestNotificationComponent } from './components/booking-request-notification/booking-request-notification.component';
import { BookingRequestActionComponent } from './dialogs/sidebars/action/action.component';

@NgModule({
    declarations: [
        BookingRequestViewComponent,
        BookingRequestNotificationComponent,
        BookingRequestActionComponent
    ],
    imports: [
        FuseSharedModule,
        KM8SharedModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,

        RyTimePickerModule,
        FuseSidebarModule,
        NgProgressModule,

        NzBadgeModule,
        NzFormModule,
        NzListModule,
        NzSelectModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzDropDownModule,
        NzDatePickerModule,
        NzTabsModule,
        NzAvatarModule,
        NzEmptyModule,
        NzSkeletonModule,
        NzTagModule,
        NzCheckboxModule,
        NzAlertModule,
        NzSwitchModule
    ],
    exports: [
        BookingRequestViewComponent,
        BookingRequestNotificationComponent,
        BookingRequestActionComponent
    ],
    providers: [
        BookingRequestService
    ]
})

export class BookingRequestSharedModule { }

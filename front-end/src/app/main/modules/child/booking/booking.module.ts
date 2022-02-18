import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

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
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { FuseSidebarModule } from '@fuse/components';

import { TooltipModule } from 'ng2-tooltip-directive';

import { BookingSharedModule } from '../../modules-shared/booking/booking-shared.module';
import { AttendanceSharedModule } from '../../modules-shared/attendance/attendance-shared.module';

import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { ChildBookingService } from './services/booking.service';

import { ChildBookingComponent } from './booking.component';
import { ChildAddBookingComponent } from './dialogs/add-bookings/add-bookings.component';
import { BookingListViewComponent } from './list-view/list-view.component';
import { BookingCalendarViewComponent } from './calendar-view/calendar-view.component';
import { ChildManageBulkBookingsComponent } from './dialogs/manage-bulk-bookings/manage-bulk-bookings.component';
import { ChildCalenderFiltersComponent } from './sidenavs/right/calender-filters/calender-filters.component';


const routes = [
    {
        path: 'booking',
        component: ChildBookingComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N25',
            permissions: ['AC0'],
            title: 'Child - Manage Booking'
        },
        resolve:
        {
            child: ChildBookingService
        }
    }
];

@NgModule({
    declarations: [
        ChildBookingComponent,
        ChildAddBookingComponent,

        BookingListViewComponent,
        BookingCalendarViewComponent,
        ChildManageBulkBookingsComponent,
        ChildCalenderFiltersComponent,
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
        NzSkeletonModule,
        NzListModule,
        NzAvatarModule,
        NzDividerModule,
        NzAlertModule,

        FuseSidebarModule,

        TooltipModule,

        BookingSharedModule,
        AttendanceSharedModule
    ],
    providers: [
        ChildBookingService
    ]
})

export class ChildBookingModule { }

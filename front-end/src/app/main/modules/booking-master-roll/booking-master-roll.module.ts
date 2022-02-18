import { NgModule, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FuseSidebarModule } from '@fuse/components';

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
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { TooltipModule } from 'ng2-tooltip-directive';
import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { BookingHistoryService } from './services/booking-history.service';
import { ChildrenService } from '../child/services/children.service';
import { RoomService } from '../room/services/room.service';
import { ChildBookingService } from '../child/booking/services/booking.service';
import { ChildAttendanceService } from '../child/attendance/services/attendance.service';

import { BookingMasterRollCoreService } from './services/booking-core.service';
import { MasterRollWeekViewResolver } from './services/booking-week-view.resolver';

import { BookingSharedModule } from '../modules-shared/booking/booking-shared.module';
import { AttendanceSharedModule } from '../modules-shared/attendance/attendance-shared.module';

// import { InfiniteScrollModule } from 'ngx-infinite-scroll';
// import { UiScrollModule } from 'ngx-ui-scroll';

import { BookingMasterRollComponent } from './booking-master-roll.component';
import { BookingMasterRollCalendarWeekViewComponent } from './calendar-week-view/calendar-week-view.component';
import { ManagerMasterRollChildListSidenavComponent } from './sidenavs/left/manager-master-roll-child-list-sidenav/manager-master-roll-child-list-sidenav.component';
import { ManageMasterRollBookingsComponent } from './dialogs/manage-master-roll-bookings/manage-master-roll-bookings.component';
import { AddMasterRollBookingsComponent } from './dialogs/add-master-roll-bookings/add-master-roll-bookings.component';
import { ManagerMasterRollCalenderFilterComponent } from './sidenavs/right/manager-master-roll-calender-filter/manager-master-roll-calender-filter.component';
import { BookingMasterRollCalendarWeekListViewComponent } from './calendar-week-list-view/calendar-week-list-view.component';
import { BookingMasterRollCalendarWeekListTabViewComponent } from './calendar-week-list-view/tab-view/tab-view.component';
import { ManageMasterRollCalenderListViewFilterComponent } from './sidenavs/right/manage-master-roll-calender-list-view-filter/manage-master-roll-calender-list-view-filter.component';
import { MasterRollTimeSheetComponent } from './modals/master-roll-time-sheet/master-roll-time-sheet.component';
import { BookingHistoryMasterRollComponent } from './booking-history-master-roll/booking-history-master-roll.component';
import { BookingHistoryMasterRollListViewComponent } from './booking-history-master-roll/list-view/list-view.component';
import { BookingHistoryFiltersComponent } from './sidenavs/left/booking-history-filters/booking-history-filters.component';
import { BookingMasterRollFilterViewComponent } from './components/filter-view/filter-view.component';

const routes = [
    {
        path: '',
        redirectTo: 'calendar-view',
        pathMatch: 'full',
    },
    {
        path: '',
        component: BookingMasterRollComponent,
        children: [
            {
                path: 'calendar-view',
                component: BookingMasterRollCalendarWeekViewComponent,
                canActivate: [
                    AuthGuard
                ],
                data:
                {
                    belongsTo: 'N25',
                    permissions: ['AC0'],
                    title: 'Manage Master Roll - Calendar View'
                },
                resolve:
                {
                    children: MasterRollWeekViewResolver
                }
            },
            {
                path: 'list-view',
                component: BookingMasterRollCalendarWeekListViewComponent,
                canActivate: [
                    AuthGuard
                ],
                data:
                {
                    belongsTo: 'N25',
                    permissions: ['AC0'],
                    title: 'Manage Master Roll - List View'
                },
                resolve:
                {
                    children: MasterRollWeekViewResolver
                }
            }
        ]
    },
    {
        path: 'booking-history',
        component: BookingHistoryMasterRollComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N25',
            permissions: ['AC0'],
            title: 'Manage Master Roll - Booking History'
        },
        resolve:
        {
            bookings: BookingHistoryService
        }
    }
];

@NgModule({
    declarations: [
        BookingMasterRollComponent,
        BookingMasterRollCalendarWeekViewComponent,
        ManageMasterRollBookingsComponent,
        AddMasterRollBookingsComponent,
        ManagerMasterRollChildListSidenavComponent,
        ManagerMasterRollCalenderFilterComponent,
        BookingMasterRollCalendarWeekListViewComponent,
        BookingMasterRollCalendarWeekListTabViewComponent,
        ManageMasterRollCalenderListViewFilterComponent,
        MasterRollTimeSheetComponent,
        BookingHistoryMasterRollComponent,
        BookingHistoryMasterRollListViewComponent,
        BookingHistoryFiltersComponent,
        BookingMasterRollFilterViewComponent
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
        NzTableModule,
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
        NzDatePickerModule,
        NzModalModule,
        NzSkeletonModule,
        NzAvatarModule,
        NzDividerModule,
        NzListModule,
        NzBadgeModule,
        NzProgressModule,
        NzTagModule,
        NzAlertModule,

        FuseSidebarModule,
        TooltipModule,

        BookingSharedModule,
        AttendanceSharedModule
    ],
    providers: [
        BookingMasterRollCoreService,
        MasterRollWeekViewResolver,
        BookingHistoryService,
        ChildBookingService,
        ChildrenService,
        RoomService,
        ChildAttendanceService
    ]
})

export class BookingMasterRollModule { }

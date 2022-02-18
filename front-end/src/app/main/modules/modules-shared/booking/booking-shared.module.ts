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

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { TooltipModule } from 'ng2-tooltip-directive';

import { ChildAddEditSingleBookingComponent } from './dialogs/add-edit-single-booking/add-edit-single-booking.component';
import { SetAbsenceReasonComponent } from './modals/set-absence-reason/set-absence-reason.component';
import { BookingAddConfigComponent } from './dialogs/add-config/add-config.component';
import { ChildBookingViewHistoryComponent } from './components/view-history/view-history.component';
import { ViewBookingHistoryComponent } from './dialogs/view-booking-history/view-booking-history.component';

@NgModule({
    declarations: [
        ChildAddEditSingleBookingComponent,
        SetAbsenceReasonComponent,
        BookingAddConfigComponent,
        ChildBookingViewHistoryComponent,
        ViewBookingHistoryComponent,
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

        NzFormModule,
        NzRadioModule,
        NzSelectModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzDropDownModule,
        NzDatePickerModule,
        NzAlertModule,
        NzTableModule,
        NzTabsModule,
        NzSwitchModule,

        TooltipModule
    ],
    exports: [
        ChildAddEditSingleBookingComponent,
        SetAbsenceReasonComponent,
        BookingAddConfigComponent,
        ChildBookingViewHistoryComponent
    ],
    providers: [
        
    ]
})

export class BookingSharedModule { }

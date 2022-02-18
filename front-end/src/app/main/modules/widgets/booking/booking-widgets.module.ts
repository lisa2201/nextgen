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
import { NzSpinModule } from 'ng-zorro-antd';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { FuseWidgetModule } from '@fuse/components/widget/widget.module';

import { ChildrenService } from '../../child/services/children.service';
import { ChildBookingService } from '../../child/booking/services/booking.service';

import { WidgetBookingFeesComponent } from './widget-booking-fees/widget-booking-fees.component';
import { WidgetBookingUtilisationComponent } from './widget-booking-utilisation/widget-booking-utilisation.component';


@NgModule({
    declarations: [
        WidgetBookingFeesComponent,
        WidgetBookingUtilisationComponent
    ],
    imports: [
        FuseSharedModule,
        FuseWidgetModule,
        KM8SharedModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,
        NgxChartsModule,
        RyTimePickerModule,

        NzFormModule,
        NzRadioModule,
        NzSelectModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzDropDownModule,
        NzDatePickerModule,
        NzSpinModule
    ],
    exports: [
        WidgetBookingFeesComponent,
        WidgetBookingUtilisationComponent
    ],
    providers: [
        ChildBookingService,
        ChildrenService
    ]
})

export class BookingWidgetModule { }

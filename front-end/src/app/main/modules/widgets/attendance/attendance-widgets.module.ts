import { NgModule } from '@angular/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { FuseWidgetModule } from '@fuse/components/widget/widget.module';

import { WidgetLiveRatioComponent } from './widget-live-ratio/widget-live-ratio.component';
import { WidgetAttendanceSummaryComponent } from './widget-attendance-summary/widget-attendance-summary.component';


@NgModule({
    declarations: [
        WidgetLiveRatioComponent,
        WidgetAttendanceSummaryComponent
    ],
    imports: [
        FuseSharedModule,
        FuseWidgetModule,
        KM8SharedModule,

        MatDialogModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,
        NzGridModule,
        NzTagModule,
        NzButtonModule,
        NzIconModule,
        NzSpinModule,
        NzDatePickerModule,
        NzPopoverModule,
        NzListModule,
        NzSelectModule
    ],
    exports: [
        WidgetLiveRatioComponent,
        WidgetAttendanceSummaryComponent
    ],
    providers: [
    ]
})

export class AttendanceWidgetModule { }

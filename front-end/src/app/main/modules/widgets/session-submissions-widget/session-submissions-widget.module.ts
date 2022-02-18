import { NgModule } from '@angular/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { FuseWidgetModule } from '@fuse/components/widget/widget.module';

import { ChildSessionSubmissionService } from '../../child/session-submission/services/session-submission.service';

import { SessionSubmissionsWidgetComponent } from './session-submissions-widget/session-submissions-widget.component';

@NgModule({
    declarations: [
        SessionSubmissionsWidgetComponent
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
        NzDatePickerModule
    ],
    exports: [
        SessionSubmissionsWidgetComponent
    ],
    providers: [
        ChildSessionSubmissionService
    ]
})

export class SessionSubmissionsWidgetModule { }

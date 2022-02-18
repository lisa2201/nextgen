import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import {RyTimePickerModule, S3UploadModule} from 'app/shared/components';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
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
    NzAvatarModule
} from 'ng-zorro-antd';
import { FuseSidebarModule } from '@fuse/components';
import { TooltipModule } from 'ng2-tooltip-directive';
import { ImmunisationTrackingComponent } from './immunisation-tracking.component';
import { ImmunisationTrackerDetailViewComponent } from './immunisation-tracker-detail-view/immunisation-tracker-detail-view.component';
import { ImmunisationTrackingService } from './service/immunisation-tracking.service';
import { ChildrenService } from '../services/children.service';
import { ImmunisationDateSetDialogComponent } from './modal/immunisation-date-set-dialog/immunisation-date-set-dialog.component';



const routes = [
    {
        path: 'immunisation',
        component: ImmunisationTrackingComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N60',
            permissions: ['AC0'],
            title: 'Child - immunisation'
        },
        resolve:
        {
            immunisation: ImmunisationTrackingService
        }
    }
];

@NgModule({
    declarations: [
        ImmunisationTrackingComponent,
        ImmunisationTrackerDetailViewComponent,
        ImmunisationDateSetDialogComponent
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
        S3UploadModule,
        NzAvatarModule
    ],
    exports:[
        ImmunisationTrackerDetailViewComponent
    ],
    providers: [
        ImmunisationTrackingService,
        ChildrenService
    ]
})
export class ImmunisationTrackingModule { }

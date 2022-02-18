
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { FeesComponent } from './fees.component';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FuseSidebarModule } from '@fuse/components';

import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

import { NzFormModule, NzSelectModule, NzEmptyModule, NzButtonModule, NzIconModule, NzRadioModule, NzInputModule, NzCheckboxModule, NzDropDownModule, NzTableModule, NzDividerModule, NzDatePickerModule, NzCollapseModule, NzSkeletonModule, NzListModule, NzCardModule } from 'ng-zorro-antd';
import { FeesListViewComponent } from './list-view/list-view.component';
import { FeesFilterRightSideNavComponent } from './filter-right-side-nav/filter-right-side-nav.component';
import { FeeNewOrEditComponent } from './dialog/fee-new-or-edit/fee-new-or-edit.component';
import { FeesService } from './service/fees.service';
import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';

const routes = [
    {
        path: '',
        component: FeesComponent,
        canActivate: [AuthGuard],
        data: {
            belongsTo: 'N24',
            permissions: ['AC0'],
            title: 'Manage Fees'
        },
        resolve: {
            fees: FeesService
        }
    }
];

@NgModule({
    declarations: [
        FeesComponent,
        FeesListViewComponent,
        FeesFilterRightSideNavComponent,
        FeeNewOrEditComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        TranslateModule,
        FuseSharedModule,
        KM8SharedModule,
        FuseSidebarModule,

        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule,
        MatProgressBarModule,
        RyTimePickerModule,

        NzFormModule,
        NzSelectModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzRadioModule,
        NzInputModule,
        NzCheckboxModule,
        NzDropDownModule,
        NzTableModule,
        NzDividerModule,
        NzModalModule,
        NzSwitchModule,
        NzGridModule,
        NzDatePickerModule,
        NzDividerModule,
        NzCollapseModule,
        NzSkeletonModule,
        NzListModule,
        NzCardModule,
        NzTagModule
    ],
    providers: [
        FeesService
    ]
})
export class FeesModule {}

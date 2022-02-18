import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '../../../../../@fuse/shared.module';
import { KM8SharedModule } from '../../../../shared/shared.module';
import { FuseSidebarModule } from '../../../../../@fuse/components';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzProgressModule } from 'ng-zorro-antd/progress';

import { TooltipModule } from 'ng2-tooltip-directive';
import { AccsComponent } from './accs.component';
import { AuthGuard } from '../../../../shared/guard/auth.guard';
import { NewOrEditDeterminationComponent } from './dialogs/new-or-edit-determination/new-or-edit-determination.component';
import { AccsService } from './accs.service';
import { NewOrEditCertificateComponent } from './dialogs/new-or-edit-certificate/new-or-edit-certificate.component';
import { ListViewComponent } from './list-view/list-view.component';
import {ChildNoLongerAtRiskComponent} from './dialogs/child-no-longer-at-risk/child-no-longer-at-risk';
import {CancelCertificateComponent} from './dialogs/cancel-certificate/cancel-certificate';

const routes = [
    {
        path: 'accs',
        component: AccsComponent,
        canActivate: [AuthGuard],
        data: {
            belongsTo: 'N07',
            permissions: ['AC0', 'AC1', 'AC2', 'AC3'],
            title: 'Child - ACCS'
        },
        resolve: {
            certificate: AccsService
        },
    },
];
@NgModule({
    declarations: [
        AccsComponent,
        NewOrEditDeterminationComponent,
        NewOrEditCertificateComponent,
        ChildNoLongerAtRiskComponent,
        CancelCertificateComponent,
        ListViewComponent
    ],
    imports: [
        CommonModule,
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

        NzUploadModule,
        NzFormModule,
        NzSelectModule,
        NzSpinModule,
        NzCardModule,
        NzListModule,
        NzEmptyModule,
        NzSkeletonModule,
        NzButtonModule,
        NzIconModule,
        NzRadioModule,
        NzInputModule,
        NzCheckboxModule,
        NzDropDownModule,
        NzTabsModule,
        NzDividerModule,
        NzGridModule,
        NzSwitchModule,
        NzTableModule,
        NzPaginationModule,
        NzDatePickerModule,
        NzAvatarModule,
        NzBadgeModule,
        NzModalModule,
        NzAlertModule,
        NzProgressModule,

        TooltipModule
    ],
    providers:[
        AccsService
    ]
})
export class AccsModule {}

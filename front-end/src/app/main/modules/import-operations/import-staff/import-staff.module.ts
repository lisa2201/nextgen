import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { FuseSidebarModule } from '@fuse/components';
import { KM8SharedModule } from 'app/shared/shared.module';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzSwitchModule } from 'ng-zorro-antd/switch';


import { AuthGuard } from 'app/shared/guard/auth.guard';
import { ImportCCSEnrolmentService } from '../ccs-enrolments/services/import-enrolments.service';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { ImportStaffService } from './service/staff-import.service';
import { ImportStaffComponent } from './import-staff.component';
import { ImportParentsComponent } from '../import-parents/import-parents.component';
import { GetParentsImportModalComponent } from '../import-parents/modal/get-parents-import-modal/get-parents-import-modal.component';
import { ImportParentService } from '../import-parents/service/import-parent.service';
import { ImportStaffDialogComponent } from './modal/import-staff-dialog/import-staff-dialog.component';
import { RoleService } from '../../role/services/role.service';
const routes = [
    {
        path: '',
        component: ImportStaffComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N55',
            permissions: ['AC0'],
            title: 'Import Staff'
        },
        resolve:
        {
            staff: ImportStaffService
        }
    }
];

@NgModule({
    declarations: [
        ImportStaffComponent,
        ImportStaffDialogComponent
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
        NzCollapseModule,
        NzSpinModule,
        NzTagModule
    ],
    providers: [
        ImportStaffService,
        RoleService
    ]
})

export class ImportStaffModule { }

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

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';

import { RyTimePickerModule } from 'app/shared/components/ry-time-picker/ry-time-picker.module';

import { BranchService } from './services/branch.service';
import { BranchEditService } from './services/branch-edit.service';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { BranchComponent } from './branch.component';
import { BranchEditViewComponent } from './edit-view/branch-edit-view.component';

import { BranchAddDialogComponent } from './dialogs/new/new.component';
import { ProviderSetupService } from '../account-manager/provider-setup/services/provider-setup.service';

const routes = [
    {
        path: '',
        component: BranchComponent,
        canActivate:
        [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N03',
            permissions: ['AC0'],
            title: 'Manage Branches'
        },
        resolve:
        {
            branches: BranchService
        }
    },
    {
        path: 'edit/:id',
        component: BranchEditViewComponent,
        canActivate:
        [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N03',
            permissions: ['AC1'],
            title: 'Manage Branches - Edit'
        },
        resolve:
        {
            branch: BranchEditService
        }
    },
    {
        path      : '**',
        redirectTo: ''
    }
];

@NgModule({
    declarations: [
        BranchComponent,
        BranchAddDialogComponent,
        BranchEditViewComponent
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

        NzFormModule,
        NzCardModule,
        NzListModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzSelectModule,
        NzSpinModule,
        NzSwitchModule,
        NzTabsModule,
        NzGridModule,
        NzCheckboxModule,
        NzTableModule,
        NzTimePickerModule,

        RyTimePickerModule
    ],
    providers: [
        BranchService,
        BranchEditService,
        ProviderSetupService
    ]
})

export class BranchModule { }

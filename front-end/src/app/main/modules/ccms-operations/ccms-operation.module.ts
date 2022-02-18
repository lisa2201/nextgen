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
import { NzSwitchModule } from 'ng-zorro-antd/switch';


import { AuthGuard } from 'app/shared/guard/auth.guard';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {QueryRemittanceComponent} from './query-remittance/query-remittance.component';
import {ListViewComponent} from './list-view/list-view.component';
import {NzDatePickerModule, NzDescriptionsModule, NzGridModule, NzPaginationModule, NzToolTipModule} from 'ng-zorro-antd';
import {CcsOperationsService} from './ccs-operations.service';
import {CCMSAuthenticationComponent} from './dialogs/ccms-authentication/ccms-authentication';
import {ManageRemittanceQueryLeftSidenavComponent} from './sidenavs/manage-remittance-query-left-sidenav/manage-remittance-query-left-sidenav.component';
import {QueryRemittanceByCcsApprovalDetailComponent} from './dialogs/query-remittance-by-ccs-approval-detail/query-remittance-by-ccs-approval-detail.component';


const routes = [
    {
        path: '',
        component: QueryRemittanceComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N48',
            permissions: ['AC0'],
            title: 'Query Remittance'
        }
    }
];

@NgModule({
    declarations: [
        QueryRemittanceComponent,
        ListViewComponent,
        ManageRemittanceQueryLeftSidenavComponent,
        QueryRemittanceByCcsApprovalDetailComponent
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
        NzDatePickerModule,
        NzGridModule,
        NzSwitchModule,
        NzPaginationModule,
        NzDescriptionsModule,
        NzToolTipModule,

    ],
    providers: [
        
    ],
})

export class CcmsOperationModule { }

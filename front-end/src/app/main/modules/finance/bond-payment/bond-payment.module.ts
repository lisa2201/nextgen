import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
import { BondPaymentComponent } from './bond-payment.component';
import { BondListViewComponent } from './bond-list-view/bond-list-view.component';
import { BondFilterSidebarComponent } from './bond-filter-sidebar/bond-filter-sidebar.component';
import { BondPaymentservice } from './service/bond-payment.service';
import { NewOrEditBondPaymentComponent } from './dialog/new-or-edit-bond-payment/new-or-edit-bond-payment.component';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { ChildrenService } from '../../child/services/children.service';
import { FinanceService } from '../shared/services/finance.service';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: BondPaymentComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N50',
            permissions: ['AC0'],
            title: 'Bond Payments'
        },
        resolve: {
            resolveData: BondPaymentservice            
        }
    }
];

@NgModule({
    declarations: [
        BondPaymentComponent,
        BondListViewComponent,
        BondFilterSidebarComponent,
        NewOrEditBondPaymentComponent

    ],
    imports: [
        RouterModule.forChild(APP_ROUTES),
        NzPaginationModule,
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
        NzCardModule,
        NzListModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzInputModule,
        NzCheckboxModule,
        NzCollapseModule,
        NzSpinModule,
        NzSwitchModule,
        NzRadioModule,
        NzSelectModule,
        NzDropDownModule,
        NzLayoutModule,
        NzAvatarModule,
        NzGridModule,
        NzAlertModule,
        NzBadgeModule,
        NzToolTipModule,
        NzTableModule,
        NzDatePickerModule,
        NzDividerModule,
        NzDescriptionsModule,
    ],
    providers: [
        BondPaymentservice,
        ChildrenService,
        FinanceService
    ]
})
export class BondPaymentModule { }

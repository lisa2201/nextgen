import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';

import { FuseSidebarModule } from '@fuse/components';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TooltipModule } from 'ng2-tooltip-directive';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { NzToolTipModule } from 'ng-zorro-antd';
import { PettyCashComponent } from './petty-cash.component';
import { SupplierComponent } from './supplier/supplier.component';
import { CategoryComponent } from './category/category.component';
import { SupplierService } from './services/supplier.service';
import { AddNewSupplierComponent } from './dialog/add-new-supplier/add-new-supplier.component';
import { CategoryService } from './services/category.service';
import { AddNewCategoryComponent } from './dialog/add-new-category/add-new-category.component';
import { AddNewReceiptComponent } from './dialog/add-new-receipt/add-new-receipt.component';
import { AddNewReimbursementComponent } from './dialog/add-new-reimbursement/add-new-reimbursement.component';
import { PettyCashPrintViewComponent } from './dialog/petty-cash-print-view/petty-cash-print-view.component';
import { SummeryViewComponent } from './summery-view/summery-view.component';

const routes = [
    {
        path: '',
        component: PettyCashComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N63',
            permissions: ['AC0'],
            title: 'Petty Cash'
        },
        resolve:
        {
            supplier: SupplierService,
            category: CategoryService
        }
    }
];

@NgModule({
    declarations: [
        PettyCashComponent,
        SupplierComponent,
        CategoryComponent,
        AddNewSupplierComponent,
        AddNewCategoryComponent,
        AddNewReceiptComponent,
        AddNewReimbursementComponent,
        PettyCashPrintViewComponent,
        SummeryViewComponent
        

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
        NzTagModule,
        NzToolTipModule,

        TooltipModule,
    ],
    providers: [
        SupplierService,
        CategoryService,
    ]
})

export class PettyCashModule { }

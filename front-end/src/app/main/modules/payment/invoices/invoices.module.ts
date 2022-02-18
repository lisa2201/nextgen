import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NzButtonModule, NzListModule, NzTableModule, NzEmptyModule, NzDividerModule, NzInputModule, NzFormModule, NzRadioModule, NzIconModule, NzDropDownModule, NzModalModule, NzDatePickerModule, NzTagModule } from 'ng-zorro-antd';

import { TooltipModule } from 'ng2-tooltip-directive';
import { FuseSharedModule } from '@fuse/shared.module';
import { FuseSidebarModule } from '@fuse/components';

import { InvoicesComponent } from './invoices.component';
import { InvoiceViewComponent } from './invoice-view/invoice-view.component';
import { InvoicesListViewComponent } from './invoices-list-view/invoices-list-view.component';
import { KM8SharedModule } from 'app/shared/shared.module';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { InvoicesLeftSidenavComponent } from './sidenavs/left/invoices-left-sidenav/invoices-left-sidenav.component';
import { InvoiceListResolver } from './services/invoice-list-resolver.service';
import { InvoicesService } from './services/invoices.service';
import { InvoiceResolver } from './services/invoice-resolver.service';

const routes: Routes = [
    {
        path: '',
        component: InvoicesComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N13',
            permissions: ['AC0'],
            title: 'Manage Invoices'
        },
        resolve: {
            resolveData: InvoiceListResolver
        }
    },
    {
        path: ':id',
        component: InvoiceViewComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N13',
            permissions: ['AC0'],
            title: 'Invoice Detail'
        },
        resolve: {
            resolveData: InvoiceResolver
        }
    }
];

@NgModule({
    declarations: [
        InvoicesComponent,
        InvoicesListViewComponent,
        InvoiceViewComponent,
        InvoicesLeftSidenavComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        TranslateModule,

        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatFormFieldModule,
        MatToolbarModule,
        ReactiveFormsModule,
        FlexLayoutModule,

        NzButtonModule,
        NzListModule,
        NzTableModule,
        NzEmptyModule,
        NzDividerModule,
        NzInputModule,
        NzFormModule,
        NzRadioModule,
        NzIconModule,
        NzDropDownModule,
        NzModalModule,
        NzDatePickerModule,
        NzTagModule,

        TooltipModule,

        FuseSharedModule,
        FuseSidebarModule,

        KM8SharedModule,

    ],
    providers: [    
        InvoicesService,
        InvoiceResolver,
        InvoiceListResolver
    ]
})

export class InvoicesModule { }

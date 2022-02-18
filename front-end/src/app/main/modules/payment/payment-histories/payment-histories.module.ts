import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { NzButtonModule, NzRadioModule, NzDividerModule, NzListModule, NzTableModule, NzEmptyModule, NzInputModule, NzFormModule, NzIconModule, NzDatePickerModule, NzTagModule } from 'ng-zorro-antd';

import { PaymentHistoriesComponent } from './payment-histories.component';
import { PaymentHistoriesListViewComponent } from './payment-histories-list-view/payment-histories-list-view.component';
import { PaymentHistoriesLeftSidenavComponent } from './sidenavs/left/payment-histories-left-sidenav/payment-histories-left-sidenav.component';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { PaymentHistoriesListResolverService } from './services/payment-histories-list-resolver.service';
import { PaymentHistoriesService } from './services/payment-histories.service';

const routes: Routes = [
    {
        path: '',
        component: PaymentHistoriesComponent,
        data:
        {
            belongsTo: 'N14',
            permissions: ['AC0'],
            title: 'Manage Payment History'
        },
        resolve: {
            resolveData: PaymentHistoriesListResolverService
        }
    }
];

@NgModule({
    declarations: [
        PaymentHistoriesComponent,
        PaymentHistoriesListViewComponent,
        PaymentHistoriesLeftSidenavComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        TranslateModule,

        FlexLayoutModule,
        FuseSidebarModule,
        FuseSharedModule,

        NzButtonModule,
        NzRadioModule,
        NzDividerModule,
        NzButtonModule,
        NzListModule,
        NzTableModule,
        NzEmptyModule,
        NzInputModule,
        NzFormModule,
        NzIconModule,
        NzDatePickerModule,
        NzTagModule,

        KM8SharedModule

    ],
    providers: [
        PaymentHistoriesService,
        PaymentHistoriesListResolverService
    ]
})

export class PaymentHistoriesModule { }

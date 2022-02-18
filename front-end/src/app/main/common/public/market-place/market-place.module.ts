import { NgModule } from '@angular/core';
import { RouterModule, Route } from '@angular/router';
import { FuseSharedModule } from '@fuse/shared.module';
import { RouteGuard } from 'app/shared/guard/route.guard';
import { registerLocaleData } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { MatIconModule } from '@angular/material/icon';

import { NZ_I18N, en_US, NzRadioModule, NzCardModule, NzButtonModule } from 'ng-zorro-antd';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzGridModule } from 'ng-zorro-antd/grid';

import { MarketPlaceComponent } from './market-place.component';
import { MarketPlaceResolverService } from './services/marketplace-resolver.service';
import en from '@angular/common/locales/en';
import { FormsModule } from '@angular/forms';
import { QuotationVerifyComponent } from './quotation-verify/quotation-verify.component';
import { QuotationVerifyResolverService } from './quotation-verify/services/quotation-verify-resolver.service';

registerLocaleData(en);

const routes: Route[] = [
    {
        path: 'market-place',
        canActivate: [
            RouteGuard
        ],
        data:
        {
            title: 'Kinder M8 Marketplace'
        },
        component: MarketPlaceComponent,
        resolve: {
            resolveData: MarketPlaceResolverService
        },
    },
    {
        path: 'subscribe',
        loadChildren: () => import('../../auth/client-subscription/client-subscription.module').then(m => m.ClientSubscriptionModule)
    },
    {
        path: 'cust_plan',
        loadChildren: () => import('../../auth/custom-plan/custom-plan.module').then(m => m.CustomPlanModule)
    },
    {
        path: 'quotation-verify',
        canActivate: [
            RouteGuard
        ],
        resolve: {
            resolveData: QuotationVerifyResolverService
        },
        component: QuotationVerifyComponent,
    }
];

@NgModule({
    declarations: [
        MarketPlaceComponent,
        QuotationVerifyComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        
        FuseSharedModule,

        NzGridModule,
        NzCardModule,
        NzRateModule,
        NzRadioModule,
        NzButtonModule,
        NzSpinModule,

        MatIconModule
    ],
    providers: [
        { provide: NZ_I18N, useValue: en_US }
    ]
})
export class MarketPlaceModule {
}

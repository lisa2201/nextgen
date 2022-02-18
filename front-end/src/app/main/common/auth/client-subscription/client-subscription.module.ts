import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NzFormModule, NzInputModule, NzSelectModule, NzIconModule, NzCheckboxModule, NzButtonModule, NzSpinModule, NzResultModule, NzDividerModule, NzRadioModule, NzCollapseModule, NzToolTipModule, NzModalModule } from 'ng-zorro-antd';
import { MatDialogModule } from '@angular/material/dialog';
import { NgxCaptchaModule } from 'ngx-captcha';
import { CreditCardDirectivesModule } from 'angular-cc-library';
import { FuseSharedModule } from '@fuse/shared.module';

import { ClientSubscriptionComponent } from './client-subscription.component';
import { TermsDialogComponent } from './terms-dialog/terms-dialog.component';
import { KM8PipesModule } from 'app/shared/pipes/pipe.module';
import { SubscriptionEmailValidationComponent } from './subscription-email-validation/subscription-email-validation.component';
import { RouteGuard } from 'app/shared/guard/route.guard';
import { ClientSubscriptionResolverService } from './services/client-subscription-resolver.service';


const APP_ROUTES: Routes = [
    {
        path: '',
        canActivate: [
            RouteGuard
        ],
        data:
        {
            title: 'Subscribe to Kinder M8'
        },
        resolve: {
            resolveData: ClientSubscriptionResolverService
        },
        component: ClientSubscriptionComponent,
    }
];

@NgModule({
    declarations: [
        ClientSubscriptionComponent,
        TermsDialogComponent,
        SubscriptionEmailValidationComponent
    ],
    imports: [
        RouterModule.forChild(APP_ROUTES),

        FuseSharedModule,
        KM8PipesModule,

        NzFormModule,
        NzInputModule,
        NzSelectModule,
        NzIconModule,
        NzCheckboxModule,
        NzButtonModule,
        NzSpinModule,
        NzResultModule,
        NzDividerModule,
        NzRadioModule,
        NzCollapseModule,
        NzToolTipModule,
        NzModalModule,

        MatDialogModule,

        NgxCaptchaModule,
        CreditCardDirectivesModule,

    ],
    providers: [

    ]
})
export class ClientSubscriptionModule { }

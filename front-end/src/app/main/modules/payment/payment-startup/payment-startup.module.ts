import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentRegisterComponent } from './payment-register.component';
import { Route, RouterModule } from '@angular/router';
import { PaymentStartupResolverService } from './services/payment-startup-resolver.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NzDividerModule, NzFormModule, NzInputModule, NzSelectModule, NzIconModule, NzCheckboxModule, NzButtonModule, NzSpinModule, NzResultModule, NzRadioModule, NzCollapseModule, NzToolTipModule, NzModalModule } from 'ng-zorro-antd';
import { FlexLayoutModule } from '@angular/flex-layout';

import { FuseSharedModule } from '@fuse/shared.module';
import { CreditCardDirectivesModule } from 'angular-cc-library';

import { AuthGuard } from 'app/shared/guard/auth.guard';
import { KM8DirectivesModule } from 'app/shared/directives/directives';
import { PaymentStartupService } from './services/payment-startup.service';


const routes: Route[] = [
    {
        path: '',
        component: PaymentRegisterComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N15',
            permissions: ['AC1'],
            title: 'Payment Registration'
        },
        resolve: {
            resolveData: PaymentStartupResolverService
        }
    }
];

@NgModule({
    declarations: [PaymentRegisterComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        ReactiveFormsModule,
        FormsModule,
        FlexLayoutModule,

        FuseSharedModule,

        NzDividerModule,
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

        CreditCardDirectivesModule,

        KM8DirectivesModule

    ],
    providers: [
        PaymentStartupService,
        PaymentStartupResolverService
    ]
})
export class PaymentStartupModule { }

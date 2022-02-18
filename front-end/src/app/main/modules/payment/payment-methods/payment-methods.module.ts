import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PaymentMethodsComponent } from './payment-methods.component';
import { CreatePaymentMethodComponent } from './modal/create-payment-method/create-payment-method.component';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzButtonModule, NzListModule, NzEmptyModule, NzFormModule, NzCardModule, NzIconModule, NzInputModule, NzSelectModule, NzSpinModule, NzSwitchModule, NzDividerModule, NzRadioModule, NzCheckboxModule, NzTableModule } from 'ng-zorro-antd';
import { TooltipModule } from 'ng2-tooltip-directive';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { CreditCardDirectivesModule } from 'angular-cc-library';
import { PaymentMethodsResolverService } from './services/payment-methods-resolver.service';
import { AuthGuard } from 'app/shared/guard/auth.guard';

const routes: Routes = [
    {
        path: '',
        component: PaymentMethodsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N15',
            permissions: ['AC0'],
            title: 'Manage Payment Methods'
        },
        resolve: {
            resolveData: PaymentMethodsResolverService
        }
    }
];

@NgModule({
    declarations: [
        PaymentMethodsComponent,
        CreatePaymentMethodComponent,
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        TranslateModule,

        MatToolbarModule,
        MatDialogModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        FormsModule,
        FlexLayoutModule,

        NzButtonModule,
        NzListModule,
        NzEmptyModule,
        NzFormModule,
        NzCardModule,
        NzIconModule,
        NzInputModule,
        NzSelectModule,
        NzSpinModule,
        NzSwitchModule,
        NzDividerModule,
        NzRadioModule,
        NzCheckboxModule,
        NzTableModule,

        TooltipModule,

        FuseSharedModule,

        KM8SharedModule,

        CreditCardDirectivesModule,

    ],
    providers: [
        PaymentMethodsResolverService
    ]
})

export class PaymentMethodsModule { }

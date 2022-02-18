import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentPaymentMethodComponent } from './parent-payment-method.component';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzButtonModule, NzListModule, NzEmptyModule, NzFormModule, NzCardModule, NzIconModule, NzInputModule, NzSelectModule, NzSpinModule, NzSwitchModule, NzDividerModule, NzRadioModule, NzCheckboxModule, NzTableModule, NzTagModule } from 'ng-zorro-antd';
import { TooltipModule } from 'ng2-tooltip-directive';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { CreditCardDirectivesModule } from 'angular-cc-library';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { ParentPaymentMethodsListResolverService } from './services/parent-payment-methods-list-resolver.service';
import { CreateParentPaymentMethodComponent } from './dialog/create-parent-payment-method/create-parent-payment-method.component';
import { ParentPaymentMethodsService } from './services/parent-payment-methods.service';


const APP_ROUTES: Routes = [
    {
        path: '',
        component: ParentPaymentMethodComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N36',
            permissions: ['AC0'],
            title: 'Parent Payment Method'
        },
        resolve: {
            resolveData: ParentPaymentMethodsListResolverService            
        }
    }
];

@NgModule({
    declarations: [
        ParentPaymentMethodComponent, 
        CreateParentPaymentMethodComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
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
        NzTagModule,

        TooltipModule,

        FuseSharedModule,

        KM8SharedModule,

        CreditCardDirectivesModule,
    ],
    providers: [
        ParentPaymentMethodsService,
        ParentPaymentMethodsListResolverService
    ]
})
export class ParentPaymentMethodModule { }

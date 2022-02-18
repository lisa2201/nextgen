import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentTermsComponent } from './payment-terms.component';
import { PaymentTermsListViewComponent } from './payment-terms-list-view/payment-terms-list-view.component';
import { PaymentTermsLeftSidenavComponent } from './sidenavs/left/payment-terms-left-sidenav/payment-terms-left-sidenav.component';
import { AddEditPaymentTermsComponent } from './dialogs/add-edit-payment-terms/add-edit-payment-terms.component';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { KM8SharedModule } from 'app/shared/shared.module';
import { NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzDatePickerModule, NzToolTipModule } from 'ng-zorro-antd';
import { PaymentTermsResolverService } from './services/payment-terms-resolver.service';
import { PaymentTermsService } from './services/payment-terms.service';


const APP_ROUTES: Routes = [
    {
        path: '',
        component: PaymentTermsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N61',
            permissions: ['AC0'],
            title: 'Payment Terms'
        },
        resolve: {
            resolveData: PaymentTermsResolverService
        }
    }
];

@NgModule({
    declarations: [
        PaymentTermsComponent, 
        PaymentTermsListViewComponent, 
        PaymentTermsLeftSidenavComponent, 
        AddEditPaymentTermsComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        TranslateModule,
        ReactiveFormsModule,
        
        FlexLayoutModule,

        NzDividerModule,
        NzFormModule,
        NzInputModule,
        NzTableModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzSelectModule,
        NzCheckboxModule,
        NzSwitchModule,
        NzGridModule,
        NzRadioModule,
        NzTagModule,
        NzDatePickerModule,
        NzToolTipModule,

        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatMenuModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule
    ],
    providers: [
        PaymentTermsService,
        PaymentTermsResolverService
    ]
})
export class PaymentTermsModule { }

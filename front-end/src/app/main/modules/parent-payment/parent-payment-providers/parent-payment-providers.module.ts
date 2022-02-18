import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentPaymentProvidersComponent } from './parent-payment-providers.component';
import { AddParentPaymentProvidersDialogComponent } from './dialogs/add-parent-payment-providers-dialog/add-parent-payment-providers-dialog.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzButtonModule, NzListModule, NzEmptyModule, NzFormModule, NzCardModule, NzIconModule, NzInputModule, NzSelectModule, NzSpinModule, NzSwitchModule, NzDividerModule, NzRadioModule, NzCheckboxModule, NzTableModule, NzGridModule, NzTagModule } from 'ng-zorro-antd';
import { TooltipModule } from 'ng2-tooltip-directive';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { CreditCardDirectivesModule } from 'angular-cc-library';
import { ParentPaymentProvidersService } from './services/parent-payment-providers.service';
import { ParentPaymentProvidersListResolverService } from './services/parent-payment-providers-list-resolver.service';
import { ParentPaymentProvidersListViewComponent } from './parent-payment-providers-list-view/parent-payment-providers-list-view.component';
import { ParentPaymentProvidersLeftSidenavComponent } from './sidenavs/left/parent-payment-providers-left-sidenav/parent-payment-providers-left-sidenav.component';
import { FuseSidebarModule } from '@fuse/components';
import { MatMenuModule } from '@angular/material/menu';
import { KeyValidationDialogComponent } from './dialogs/key-validation-dialog/key-validation-dialog.component';

const APP_ROUTES: Routes = [
    {
        path: '',
        component: ParentPaymentProvidersComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N45',
            permissions: ['AC0'],
            title: 'Manage Parent Payment Providers'
        },
        resolve: {
            resolveData: ParentPaymentProvidersListResolverService
        }
    }
];

@NgModule({
    declarations: [
        ParentPaymentProvidersComponent, 
        AddParentPaymentProvidersDialogComponent, 
        ParentPaymentProvidersListViewComponent, 
        ParentPaymentProvidersLeftSidenavComponent, 
        KeyValidationDialogComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        TranslateModule,

        MatToolbarModule,
        MatDialogModule,
        MatIconModule,
        MatMenuModule,
        MatButtonModule,
        MatFormFieldModule,
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
        NzGridModule,
        NzTagModule,

        FuseSidebarModule,
        TooltipModule,
        FuseSharedModule,
        KM8SharedModule,
        CreditCardDirectivesModule
    ],
    providers: [
        ParentPaymentProvidersService,
        ParentPaymentProvidersListResolverService
    ]
})
export class ParentPaymentProvidersModule { }

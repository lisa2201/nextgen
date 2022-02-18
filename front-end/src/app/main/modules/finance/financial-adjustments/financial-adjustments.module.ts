import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FinancialAdjustmentsComponent } from './financial-adjustments.component';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { FinancialAdjustmentsListViewComponent } from './financial-adjustments-list-view/financial-adjustments-list-view.component';
import { FinancialAdjustmentsLeftSidenavComponent } from './sidenavs/left/financial-adjustments-left-sidenav/financial-adjustments-left-sidenav.component';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { FinancialAdjustmentsListResolverService } from './services/financial-adjustments-list-resolver.service';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzSwitchModule, NzGridModule, NzRadioModule, NzTagModule, NzAlertModule } from 'ng-zorro-antd';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FinancialAdjustmentsService } from './services/financial-adjustments.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';


const APP_ROUTES: Routes = [
    {
        path: '',
        component: FinancialAdjustmentsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N27',
            permissions: ['AC0'],
            title: 'Financial Adjustments'
        },
        resolve: {
            resolveData: FinancialAdjustmentsListResolverService
        }
    }
];

@NgModule({
    declarations: [
        FinancialAdjustmentsComponent, 
        FinancialAdjustmentsListViewComponent, 
        FinancialAdjustmentsLeftSidenavComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        TranslateModule,
        ReactiveFormsModule,
        
        FlexLayoutModule,

        NzDatePickerModule,
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
        NzAlertModule,
        
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
        FinancialAdjustmentsService,
        FinancialAdjustmentsListResolverService,
        DatePipe
    ]
})
export class FinancialAdjustmentsModule { }

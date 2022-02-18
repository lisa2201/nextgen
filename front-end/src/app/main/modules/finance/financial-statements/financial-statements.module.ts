import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialStatementsComponent } from './financial-statements.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { FinancialStatementsListViewComponent } from './financial-statements-list-view/financial-statements-list-view.component';
import { FinancialStatementsLeftSidenavComponent } from './sidenavs/left/financial-statements-left-sidenav/financial-statements-left-sidenav.component';
import { TranslateModule } from '@ngx-translate/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzTagModule, NzGridModule, NzTransferModule, NzListModule, NzAlertModule, NzRadioModule, NzToolTipModule, NzSelectModule, NzCheckboxModule } from 'ng-zorro-antd';
import { FuseSidebarModule } from '@fuse/components';
import { FuseSharedModule } from '@fuse/shared.module';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FinancialStatementsListResolverService } from './services/financial-statements-list-resolver.service';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AddFinancialStatementsComponent } from './add-financial-statements/add-financial-statements.component';
import { AddFinancialStatementsResolverService } from './services/add-financial-statements-resolver.service';
import { FinancialStatementsService } from './services/financial-statements.service';
import { ReactiveFormsModule } from '@angular/forms';
import { AddFinancialStatementUserLeftSidenavComponent } from './add-financial-statements/sidenavs/left/add-financial-statement-user-left-sidenav/add-financial-statement-user-left-sidenav.component';


const APP_ROUTES: Routes = [
    {
        path: '',
        component: FinancialStatementsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N36',
            permissions: ['AC0'],
            title: 'Financial Statements'
        },
        resolve: {
            resolveData: FinancialStatementsListResolverService
        }
    },
    {
        path: 'generate-statement',
        component: AddFinancialStatementsComponent,
        canActivate: [
            AuthGuard
        ],
        data:
        {
            belongsTo: 'N36',
            permissions: ['AC1'],
            title: 'Generate Statements'
        },
        resolve: {
            resolveData: AddFinancialStatementsResolverService
        }
    }
];

@NgModule({
    declarations: [
        FinancialStatementsComponent,
        FinancialStatementsListViewComponent,
        FinancialStatementsLeftSidenavComponent,
        AddFinancialStatementsComponent,
        AddFinancialStatementUserLeftSidenavComponent
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
        NzTagModule,
        NzGridModule,
        NzTransferModule,
        NzListModule,
        NzAlertModule,
        NzRadioModule,
        NzToolTipModule,
        NzSelectModule,
        NzCheckboxModule,

        MatMenuModule,
        MatIconModule,
        MatButtonModule,
        MatToolbarModule,
        MatFormFieldModule,
        MatDialogModule,

        FuseSidebarModule,
        FuseSharedModule,

        KM8SharedModule
    ],
    providers: [
        FinancialStatementsService,
        FinancialStatementsListResolverService,
        AddFinancialStatementsResolverService
    ]
})
export class FinancialStatementsModule { }

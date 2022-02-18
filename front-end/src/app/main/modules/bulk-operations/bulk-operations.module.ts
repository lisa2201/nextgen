import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NzDatePickerModule, NzDividerModule, NzFormModule, NzInputModule, NzTableModule, NzEmptyModule, NzButtonModule, NzIconModule, NzSelectModule, NzGridModule, NzListModule, NzSpinModule } from 'ng-zorro-antd';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { KM8SharedModule } from 'app/shared/shared.module';
import { FuseSharedModule } from '@fuse/shared.module';


const APP_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'ccs-payments',
        pathMatch: 'full'
    },
    {
        path: 'ccs-payments',
        loadChildren: () => import('./financial-ccs-payments/financial-ccs-payments.module').then(m => m.FinancialCcsPaymentsModule)
    },
    {
        path: 'session-submissions',
        loadChildren: () => import('./session-submission/session-submission.module').then(m => m.BulkSessionSubmissionsModule)
    },
    {
        path: 'session-subsidy',
        loadChildren: () => import('./session-subsidy/session-subsidy.module').then(m => m.SessionSubsidyModule)
    },
    {
        path: 'session-reports',
        loadChildren: () => import('../session-submissions-ccs/session-submissions.module').then(m => m.SessionSubmissionsModule)
    },
    {
        path: 'entitlements',
        loadChildren: () => import('../entitlement-ccs/entitlement-ccs.module').then(m => m.EntitlementCcsModule)
    }
    ,
    {
        path: 'ccs-entitlement-variation',
        loadChildren: () => import('../entitlement-variation-ccs/entitlement-variation-ccs.module').then(m => m.EntitlementVariationCcsModule)
    }
];

@NgModule({
    declarations: [

    ],
    imports: [
        RouterModule.forChild(APP_ROUTES),

        KM8SharedModule,
        FuseSharedModule,

        NzDatePickerModule,
        NzDividerModule,
        NzFormModule,
        NzInputModule,
        NzTableModule,
        NzEmptyModule,
        NzButtonModule,
        NzIconModule,
        NzSelectModule,
        NzGridModule,
        NzListModule,
        NzSpinModule,

        MatTabsModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
    ]
})
export class BulkOperationsModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceSettingsComponent } from './service-settings.component';
import { AuthGuard } from 'app/shared/guard/auth.guard';
import { RouterModule, Routes } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

const routes: Routes = [
    {
        path: '',
        component: ServiceSettingsComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N41',
            permissions: ['AC0'],
            title: 'Service Settings'
        },
        children: [
            {
                path: 'adjustment-items',
                loadChildren: () => import('./adjustment-items/adjustment-items.module').then(m => m.AdjustmentItemsModule)
            },
            {
                path: 'center-pincode',
                loadChildren: () => import('./pincode/pincode.module').then(m => m.PincodeModule)
            },
            {
                path: 'educator-ratio',
                loadChildren: () => import('./educator-ratio/educator-ratio.module').then(m => m.EducatorRatioModule)
            },
            {
                path: 'bus-list',
                loadChildren: () => import('./bus-list/bus-list.module').then(m => m.BusListModule)
            }
            ,
            {
                path: 'bus-list',
                loadChildren: () => import('./bus-list/bus-list.module').then(m => m.BusListModule)
            }
        ]
    }
];

@NgModule({
    declarations: [
        ServiceSettingsComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),

        MatTabsModule
    ]
})
export class ServiceSettingsModule { }

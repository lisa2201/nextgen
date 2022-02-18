import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FuseSharedModule } from '@fuse/shared.module';

import { RouteResolveGuard } from 'app/shared/guard/route-resolve.guard';

import { MaintenanceComponent } from './maintenance.component';

const routes = [
    {
        path: 'under-maintenance',
        canActivate: [
            RouteResolveGuard
        ],
        component: MaintenanceComponent
    }
];

@NgModule({
    declarations: [
        MaintenanceComponent
    ],
    imports     : [
        RouterModule.forChild(routes),

        FuseSharedModule
    ]
})
export class MaintenanceModule
{
}

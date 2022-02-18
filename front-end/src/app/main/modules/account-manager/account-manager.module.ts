import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FuseSharedModule } from '@fuse/shared.module';
import { AccountManagerComponent } from './account-manager.component';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { KM8DirectivesModule } from 'app/shared/directives/directives';
import { AccountManagerService } from './account-manager.service';


const APP_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'modules/providers',
        pathMatch: 'full',
    },
    {
        path: 'modules',
        component: AccountManagerComponent,
        children: [
            {
                path: 'providers',
                loadChildren: () => import('./provider-setup/provider-setup.module').then(m => m.ProviderSetupModule)
            },
            {
                path: 'services',
                loadChildren: () => import('./service-setup/service-setup.module').then(m => m.ServiceSetupModule)
            },
            {
                path: 'personnels/service',
                loadChildren: () => import('./provider-personnel-setup/service-personnel.module').then(m => m.ServicePersonnelModule)
            },
            {
                path: 'personnels/provider',
                loadChildren: () => import('./provider-personnel-setup/provider-personnel.module').then(m => m.ProviderPersonnelModule)
            }
           
        ]
    } 
];


@NgModule({
    declarations: [
        AccountManagerComponent,
    
        
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
        TranslateModule,

        MatTabsModule,

        FuseSharedModule,

        KM8DirectivesModule
    ],
    providers: [
        AccountManagerService
    ]
})

export class AccountManagerModule {
}

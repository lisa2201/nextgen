import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { KM8SharedModule } from 'app/shared/shared.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { SettingsComponent } from './settings.component';


const routes = [
    {
        path: '',
        component: SettingsComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N17',
            permissions: ['AC0']
        }
    }
];

@NgModule({
    declarations: [
        SettingsComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,

        KM8SharedModule
    ]
})

export class SettingsModule { }

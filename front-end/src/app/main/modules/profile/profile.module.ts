import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { KM8SharedModule } from 'app/shared/shared.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { ProfileComponent } from './profile.component';


const routes = [
    {
        path: '',
        component: ProfileComponent,
        canActivate: [
            AuthGuard
        ],
        // data: {
        //     belongsTo: 'N03',
        //     permissions: ['AC0']
        // }
    }
];

@NgModule({
    declarations: [
        ProfileComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,

        KM8SharedModule
    ]
})

export class ProfileModule { }

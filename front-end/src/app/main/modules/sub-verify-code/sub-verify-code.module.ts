import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { KM8SharedModule } from 'app/shared/shared.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';

import { SubVerifyCodeComponent } from './sub-verify-code.component';


const routes = [
    {
        path: '',
        component: SubVerifyCodeComponent,
        canActivate: [
            AuthGuard
        ],
        data: {
            belongsTo: 'N08',
            permissions: ['AC0']
        }
    }
];

@NgModule({
    declarations: [
        SubVerifyCodeComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,

        KM8SharedModule
    ]
})

export class SubVerifyCodeModule { }

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { NzButtonModule } from 'ng-zorro-antd/button';

import { NotFoundComponent } from './not-found.component';

import { PublicGuard } from 'app/shared/guard/public.guard';

const routes = [
    {
        path: 'not-found',
        component: NotFoundComponent,
        canActivate: [
            PublicGuard
        ]
    }
];

@NgModule({
    declarations: [
        NotFoundComponent
    ],
    imports     : [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,

        NzButtonModule
    ]
})
export class NotFoundModule
{
}

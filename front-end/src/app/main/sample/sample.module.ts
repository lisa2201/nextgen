import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FuseSharedModule } from '@fuse/shared.module';

import { KM8SharedModule } from 'app/shared/shared.module';

import { AuthGuard } from 'app/shared/guard/auth.guard';
import { RouteGuard } from 'app/shared/guard/route.guard';

import { SampleComponent } from './sample.component';

const routes = [
    {
        path: '',
        component: SampleComponent,
        // canActivate: [
        //     RouteGuard
        // ]
    }
];

@NgModule({
    declarations: [
        SampleComponent
    ],
    imports     : [
        RouterModule.forChild(routes),

        TranslateModule,

        FuseSharedModule,

        KM8SharedModule
    ],
})
export class SampleModule
{
}

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';

import { FuseSharedModule } from '@fuse/shared.module';

import { RouteGuard } from 'app/shared/guard/route.guard';

import { SiteManagerLoginComponent } from './site-manager-login.component';

const routes = [
    {
        path: 'sm-login',
        canActivate: [
            RouteGuard
        ],
        component: SiteManagerLoginComponent,
        data: 
        {
            disableLoaderAnimation: true
        }
    }
];

@NgModule({
    declarations: [
        SiteManagerLoginComponent
    ],
    imports     : [
        RouterModule.forChild(routes),

        MatFormFieldModule,
        MatIconModule,
        MatInputModule,

        NzFormModule,
        NzButtonModule,
        NzInputModule,
        NzCheckboxModule,

        FuseSharedModule
    ]
})
export class SiteManagerLoginModule
{
}

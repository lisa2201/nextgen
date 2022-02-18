import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';

import { FuseSharedModule } from '@fuse/shared.module';

import { RouteGuard } from 'app/shared/guard/route.guard';

import { PortalLoginComponent } from './portal-login.component';


const routes = [
    {
        path: 'portal-login',
        canActivate: [
            RouteGuard
        ],
        component: PortalLoginComponent,
        data: 
        {
            disableLoaderAnimation: true
        }
    }
];

@NgModule({
    declarations: [
        PortalLoginComponent
    ],
    imports     : [
        RouterModule.forChild(routes),

        MatButtonModule,
        MatCheckboxModule,
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
export class PortalLoginModule
{
}

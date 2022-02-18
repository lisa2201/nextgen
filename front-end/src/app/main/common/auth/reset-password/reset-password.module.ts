import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { FuseSharedModule } from '@fuse/shared.module';

import { ResetPasswordService } from './reset-password.service';

import { RouteGuard } from 'app/shared/guard/route.guard';

import { ResetPasswordComponent } from './reset-password.component';

const routes = [
    {
        path: 'reset-password',
        canActivate: [
            RouteGuard
        ],
        component: ResetPasswordComponent,
        data: 
        {
            disableLoaderAnimation: true,
        },
        resolve: 
        {
            user: ResetPasswordService
        }
    }
];

@NgModule({
    declarations: [
        ResetPasswordComponent
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
        NzAlertModule,

        FuseSharedModule
    ],
    providers: [
        ResetPasswordService
    ]
})
export class ResetPasswordModule
{
}

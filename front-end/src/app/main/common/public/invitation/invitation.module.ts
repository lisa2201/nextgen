import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

import { FuseSharedModule } from '@fuse/shared.module';

import { NgxCaptchaModule } from 'ngx-captcha';

import { InvitationAuthComponent } from './invitation.component';

import { RouteGuard } from 'app/shared/guard/route.guard';

import { InvitationAuthService } from './invitation.service';

import { TermsDialogComponent } from './dialogs/terms/terms-dialog/terms-dialog.component';

const routes = [
    {
        path: 'invitation',
        canActivate: [
            RouteGuard
        ],
        component: InvitationAuthComponent,
        resolve:
        {
            invitation: InvitationAuthService
        }
    }
];

@NgModule({
    declarations: [
        InvitationAuthComponent,
        TermsDialogComponent
    ],
    imports: [
        RouterModule.forChild(routes),

        FuseSharedModule,

        MatDialogModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,

        NzButtonModule,
        NzInputModule,
        NzCheckboxModule,
        NzFormModule,
        NzDatePickerModule,

        NgxCaptchaModule
    ],
    providers: [
        InvitationAuthService
    ]
})
export class InvitationAuthModule {
}

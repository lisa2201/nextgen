import { NgModule } from '@angular/core';

import { FuseSharedModule } from '@fuse/shared.module';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NZ_I18N, en_US, NzFormModule, NzButtonModule, NzSelectModule, NzSpinModule, NzInputModule, NzModalModule } from 'ng-zorro-antd';
import { NgxCaptchaModule } from 'ngx-captcha';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';

import { CustomPlanEmailValidationComponent } from './custom-plan-email-validation/custom-plan-email-validation.component';
import { Routes, RouterModule } from '@angular/router';
import { RouteGuard } from 'app/shared/guard/route.guard';
import { CustomPlanResolverService } from '../../public/market-place/services/custom-plan-resolver.service';
import { CustomPlanComponent } from './custom-plan.component';
import { MatCheckboxModule } from '@angular/material/checkbox';

const APP_ROUTES: Routes = [
    {
        path: '',
        canActivate: [
            RouteGuard
        ],
        data:
        {
            title: 'Subscribe to Kinder M8'
        },
        resolve: {
            resolveData: CustomPlanResolverService
        },
        component: CustomPlanComponent,
    }
];

@NgModule({
    declarations: [
        CustomPlanComponent,
        CustomPlanEmailValidationComponent
    ],
    imports: [
        RouterModule.forChild(APP_ROUTES),

        FuseSharedModule,

        NzGridModule,
        NgxCaptchaModule,
        NzNotificationModule,
        NzResultModule,
        NzFormModule,
        NzButtonModule,
        NzSelectModule,
        NzSpinModule,
        NzInputModule,
        NzCheckboxModule,
        NzModalModule,

        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatListModule,
        MatDialogModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatCheckboxModule,
        MatToolbarModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatCardModule,
        MatMenuModule,
        MatIconModule
    ],
    exports: [],
    providers: []
})
export class CustomPlanModule { }



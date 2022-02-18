import {NgModule} from '@angular/core';

import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {FuseSharedModule} from '@fuse/shared.module';

import {PortalLoginModule} from './auth/portal-login/portal-login.module';
import {SiteManagerLoginModule} from './auth/site-manager-login/site-manager-login.module';
import {ClientLoginModule} from './auth/client-login/client-login.module';
import {ForgotPasswordModule} from './auth/forgot-password/forgot-password.module';
import {ResetPasswordModule} from './auth/reset-password/reset-password.module';

import {NotFoundModule} from './error/not-found/not-found.module';
import {MaintenanceModule} from './extra/maintenance/maintenance.module';

import {InvitationAuthModule} from './public/invitation/invitation.module';
import {MarketPlaceModule} from './public/market-place/market-place.module';
import {ClientSubscriptionModule} from './auth/client-subscription/client-subscription.module';
import {PasswordSetupAuthModule} from './public/password-setup/password-setup.module';
import {WaitlistTemplateModule} from './public/waitlist/waitlist-template.module';

import {CommonTermsAndConditionComponent} from './public/dialog/common-terms-and-condition/common-terms-and-condition.component';
import { KisokSetupModule } from './public/kisok-setup/kisok-setup.module';

@NgModule({
    imports: [
        // Authentication
        PortalLoginModule,
        SiteManagerLoginModule,
        ClientLoginModule,
        ForgotPasswordModule,
        ResetPasswordModule,

        // Public
        InvitationAuthModule,
        MarketPlaceModule,
        ClientSubscriptionModule,
        WaitlistTemplateModule,
        PasswordSetupAuthModule,
        KisokSetupModule,

        // Coming-soon
        // ComingSoonModule,

        // Errors
        NotFoundModule,
        // Error404Module,
        // Error500Module,

        // Maintenance
        MaintenanceModule,
        MatToolbarModule,
        MatIconModule,
        FuseSharedModule
    ],
    declarations: [
        CommonTermsAndConditionComponent
    ]
})
export class CommonModule {

}

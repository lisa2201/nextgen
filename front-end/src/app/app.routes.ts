import { Routes } from '@angular/router';
import { RouteGuard } from './shared/guard/route.guard';

export const APP_ROUTES: Routes = [
    {
        path: '',
        canActivate: [ RouteGuard ],
        children: [],
        pathMatch: 'full'
    },

    {
        path: 'dashboard',
        loadChildren: () => import('./main/modules/dashboard/dashboard.module').then(m => m.DashboardModule)
    },

    {
        path: 'manage-branches',
        loadChildren: () => import('./main/modules/branch/branch.module').then(m => m.BranchModule)
    },

    {
        path: 'manage-roles',
        loadChildren: () => import('./main/modules/role/role.module').then(m => m.RoleModule)
    },

    {
        path: 'manage-permissions',
        loadChildren: () => import('./main/modules/permission/permission.module').then(m => m.PermissionModule)
    },

    {
        path: 'manage-invitations',
        loadChildren: () => import('./main/modules/invitation/invitation.module').then(m => m.InvitationModule)
    },

    {
        path: 'manage-subscription',
        loadChildren: () => import('./main/modules/organization/organization.module').then(m => m.OrganizationModule)
    },
    {
        path: 'manage-payment',
        loadChildren: () => import('./main/modules/payment/payment.module').then(m => m.PaymentModule)
    },

    // --- User Module Routes ---
    {
        path: 'manage-users',
        loadChildren: () => import('./main/modules/user/user.module').then(m => m.UserModule)
    },
    {
        path: 'manage-staffs',
        loadChildren: () => import('./main/modules/user/user.module').then(m => m.UserModule)
    },
    {
        path: 'manage-parents',
        loadChildren: () => import('./main/modules/user/user.module').then(m => m.UserModule)
    },
    // --- End User Module Routes ---

    {
        path: 'manage-children',
        loadChildren: () => import('./main/modules/child/child.module').then(m => m.ChildModule)
    },

    {
        path: 'account-manager',
        loadChildren: () => import('./main/modules/account-manager/account-manager.module').then(m => m.AccountManagerModule)
    },
    {
        path: 'account-manager-branch',
        loadChildren: () => import('./main/modules/account-manager/account-manager-branch/account-manager-branch.module').then(m => m.AccountManagerBranchModule)
    },
    {
        path: 'manage-rooms',
        loadChildren: () => import('./main/modules/room/room.module').then(m => m.RoomModule)
    },

    {
        path: 'manage-master-roll',
        loadChildren: () => import('./main/modules/booking-master-roll/booking-master-roll.module').then(m => m.BookingMasterRollModule)
    },

    {
        path: 'ccs-setup',
        loadChildren: () => import('./main/modules/ccs-setup/ccs-setup.module').then(m => m.CcsSetupModule)
    },
    {
        path: 'staff-incident',
        loadChildren: () => import('./main/modules/staff-incident/staff-incident.module').then(m => m.StaffIncidentModule)
    },
    {
        path: 'finance',
        loadChildren: () => import('./main/modules/finance/finance.module').then(m => m.FinanceModule)
    },
    {
        path: 'ccs-notification',
        loadChildren: () => import('./main/modules/ccs-setup/provider-notification/provider-notification.module').then(m => m.ProviderNotificationModule)
    },
    {
        path: 'query-remittance',
        loadChildren: () => import('./main/modules/ccms-operations/ccms-operation.module').then(m => m.CcmsOperationModule)
    },
    {
        path: 'query-payments',
        loadChildren: () => import('./main/modules/query-payments/query-payments.module').then(m => m.QueryPaymentsModule)
    },
    {
        path: 'ccms-connection',
        loadChildren: () => import('./main/modules/ccms-operations/ping-ccms/ping-ccms.module').then(m => m.PingCcmsModule)
    },
    {
        path: 'session-submissions',
        loadChildren: () => import('./main/modules/session-submissions-ccs/session-submissions.module').then(m => m.SessionSubmissionsModule)
    },
    {
        path: 'manage-parent-payment',
        loadChildren: () => import('./main/modules/parent-payment/parent-payment.module').then(m => m.ParentPaymentModule)
    },
    {
        path: 'care-provided-and-vacancy',
        loadChildren: () => import('./main/modules/care-provided-vacancy/care-provided-vacancy.module').then(m => m.CareProvidedVacancyModule)
    },
    {
        path: 'bulk-operations',
        loadChildren: () => import('./main/modules/bulk-operations/bulk-operations.module').then(m => m.BulkOperationsModule)
    },
    {
        path: 'manage-waitlist',
        loadChildren: () => import('./main/modules/waitlist-enrollment/waitlist-enrollment.module').then(m => m.WaitlistEnrollmentModule)
    },
    {
        path: 'service-settings',
        loadChildren: () => import('./main/modules/service-settings/service-settings.module').then(m => m.ServiceSettingsModule)
    },
    {
        path: 'manage-debt',
        loadChildren: () => import('./main/modules/debt/debt.module').then(m => m.DebtModule)
    },
    {
        path: 'inclusion-support',
        loadChildren: () => import('./main/modules/is-case/is-case.module').then(m => m.IsCaseModule)
    },
    {
        path: 'master',
        loadChildren: () => import('./main/modules/waitlist-form-config/waitlist-template.module').then(m => m.WaitlistTemplateModule)
    },

    /*------------ Parent -----------*/
    {
        path: 'home',
        loadChildren: () => import('./main/modules/home/home.module').then(m => m.HomeModule)
    },

    {
        path: 'children',
        loadChildren: () => import('./main/modules/parent-child/parent-child.module').then(m => m.ParentChildModule)
    },

    {
        path: 'emergency-contacts',
        loadChildren: () => import('./main/modules/parent-emergency-contacts/parent-emergency-contacts.module').then(m => m.ParentEmergencyContactsModule)
    },

    {
        path: 'profile-setting',
        loadChildren: () => import('./main/modules/profile-setting/profile-setting.module').then(m => m.ProfileSettingModule)
    },

    {
        path: 'server-logs',
        loadChildren: () => import('./main/modules/server-log-viewer/server-log-viewer.module').then(m => m.ServerLogViewerModule)
    },


    {
        path: 'manage-fees',
        loadChildren: () => import('./main/modules/centre-settings/fees/fees.module').then(m => m.FeesModule)
    },
    {
        path: 'centre-settings',
        loadChildren: () => import('./main/modules/centre-settings/center-settings/center-settings.module').then(m => m.CenterSettingsModule)
    },
    {
        path: 'manage-parent-payment',
        loadChildren: () => import('./main/modules/parent-payment/parent-payment.module').then(m => m.ParentPaymentModule),
    },
    {
        path: 'manage-message',
        loadChildren: () => import('./main/modules/message/message.module').then(m => m.MessageModule),
    },
    {
        path: 'innovative-solution-cases',
        loadChildren: () => import('./main/modules/innovative-solution-cases/innovative-solution-cases.module').then(m => m.InnovativeSolutionModule),
    },
    {
        path: 'innovative-solution-cases-claims',
        loadChildren: () => import('./main/modules/innovative-solution-cases-claims/innovative-solution-cases-claims.module').then(m => m.InnovativeSolutionCasesClaimsModule),
    },
    {
        path: 'manage-reports',
        loadChildren: () => import('./main/modules/report/report.module').then(m => m.ReportModule),
    },

    {
        path: 'import-enrollments',
        loadChildren: () => import('./main/modules/import-operations/ccs-enrolments/ccs-enrolments.module').then(m => m.ImportCCSEnrollmentsModule),
    },
    {
        path: 'import-bookings',
        loadChildren: () => import('./main/modules/import-operations/bookings/bookings.module').then(m => m.ImportBookingsModule),
    },
    {
        path: 'import-parents',
        loadChildren: () => import('./main/modules/import-operations/import-parents/import-parents.module').then(m => m.ImportParentsModule),
    },
    {
        path: 'import-educators',
        loadChildren: () => import('./main/modules/import-operations/import-staff/import-staff.module').then(m => m.ImportStaffModule),
    },
    {
        path: 'kinderconnect',
        loadChildren: () => import('./main/modules/centre-settings/center-settings/center-settings.module').then(m => m.CenterSettingsModule)
    },
    {
        path: 'manage-immunisation',
        loadChildren: () => import('./main/modules/immunisation/immunisation.module').then(m => m.ImmunisationModule)
    },
    {
        path: 'bulk-sns',
        loadChildren: () => import('./main/modules/bulk-operations/bulk-sns/bulk-sns.module').then(m => m.BulkSNSModule)
    },
    {
        path: '**',
        redirectTo: ''
    }
];

<?php

namespace Kinderm8\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * This namespace is applied to your controller routes.
     *
     * In addition, it is set as the URL generator's root namespace.
     *
     * @var string
     */
    protected $namespace = 'Kinderm8\Http\Controllers';

    /**
     * Define your route model bindings, pattern filters, etc.
     *
     * @return void
     */
    public function boot()
    {
        //

        parent::boot();
    }

    /**
     * Define the routes for the application.
     *
     * @return void
     */
    public function map()
    {
        $this->mapApiRoutes();

        $this->mapWebRoutes();
    }

    /**
     * Define the "web" routes for the application.
     *
     * These routes all receive session state, CSRF protection, etc.
     *
     * @return void
     */
    protected function mapWebRoutes()
    {
        Route::middleware('web')
             ->namespace($this->namespace)
             ->group(base_path('routes/web.php'));
    }

    /**
     * Define the "api" routes for the application.
     *
     * These routes are typically stateless.
     *
     * @return void
     */
    protected function mapApiRoutes()
    {
        Route::group([
            'prefix' => 'v1/kinderm8-services',
            'middleware' => 'api',
            'namespace' => $this->namespace
        ],
        function ($router)
        {
            // web
            require base_path('routes/api/passport-auth-routes.php');
            require base_path('routes/api/branch-routes.php');
            require base_path('routes/api/common-routes.php');
            require base_path('routes/api/emergency-contact-routes.php');
            require base_path('routes/api/organization-routes.php');
            require base_path('routes/api/permission-routes.php');
            require base_path('routes/api/role-routes.php');
            require base_path('routes/api/subscription-routes.php');
            require base_path('routes/api/subscription-verify-code-routes.php');
            require base_path('routes/api/user-invitation-routes.php');
            require base_path('routes/api/user-routes.php');
            require base_path('routes/api/addon-routes.php');
            require base_path('routes/api/room-routes.php');
            require base_path('routes/api/child-routes.php');
            require base_path('routes/api/payment-routes.php');
            require base_path('routes/api/ccs-setup-routes.php');
            require base_path('routes/api/provider-setup-routes.php');
            require base_path('routes/api/invoice-routes.php');
            require base_path('routes/api/service-setup-routes.php');
            require base_path('routes/api/fees-routes.php');
            require base_path('routes/api/enrolment-routes.php');
            require base_path('routes/api/booking-routes.php');
            require base_path('routes/api/parent-payment-routes.php');
            require base_path('routes/api/waitlist-routes.php');
            require base_path('routes/api/profile-setting-routes.php');
            require base_path('routes/api/parent-payment-adjustment-routes.php');
            require base_path('routes/api/parent-payment-transaction-routes.php');
            require base_path('routes/api/parent-child-routes.php');
            require base_path('routes/api/booking-request-routes.php');
            require base_path('routes/api/care-provided-vacancy-routes.php');
            require base_path('routes/api/health-medical-routes.php');
            require base_path('routes/api/parent-payment-balance-adjustment-routes.php');
            require base_path('routes/api/parent-payment-statement-routes.php');
            require base_path('routes/api/attendance-routes.php');
            require base_path('routes/api/accs-routes.php');
            require base_path('routes/api/return-fee-reduction-routes.php');
            require base_path('routes/api/session-submission-routes.php');
            require base_path('routes/api/personnel-service.php');
            require base_path('routes/api/personnel-provider.php');
            require base_path('routes/api/debt-routes.php');
            require base_path('routes/api/upload-routes.php');
            require base_path('routes/api/adjustment-item-routes.php');
            require base_path('routes/api/finance-routes.php');
            require base_path('routes/api/is-case-routes.php');
            require base_path('routes/api/ccms-operations-routes.php');
            require base_path('routes/api/dss-message-routes.php');
            require base_path('routes/api/bond-payment-routes.php');
            require base_path('routes/api/report-routes.php');
            require base_path('routes/api/booking-master-roll-routes.php');
            require base_path('routes/api/import-operations-routes.php');
            require base_path('routes/api/booking-master-roll-routes.php');
            require base_path('routes/api/manage-session-submissions-routes.php');
            require base_path('routes/api/booking-history-routes.php');
            require base_path('routes/api/parent-finance-exclusion-routes.php');
            require base_path('routes/api/log-viewer-routes.php');
            require base_path('routes/api/immunisation-routes.php');
            require base_path('routes/api/payment-terms-routes.php');
            require base_path('routes/api/petty-cash-routes.php');
            require base_path('routes/api/parent-payment-provider-routes.php');
            require base_path('routes/api/parent-payment-schedule-routes.php');
            require base_path('routes/api/staff-incident-routes.php');

            // mobile
            require base_path('routes/mobile-api/login-routes.php');
            require base_path('routes/mobile-api/booking-routes.php');
            require base_path('routes/mobile-api/kiosk-routes.php');
            require base_path('routes/mobile-api/parent-routes.php');
            require base_path('routes/mobile-api/staff-attendance-routes.php');
            require base_path('routes/mobile-api/booking-request-routes.php');
            require base_path('routes/mobile-api/bus-list-routes.php');
            require base_path('routes/mobile-api/upload-routes.php');
            require base_path('routes/mobile-api/visitor-sign-in-routes.php');
            require base_path('routes/mobile-api/settings-routes.php');
            require base_path('routes/mobile-api/staff-incident-routes.php');
            require base_path('routes/mobile-api/user-routes.php');
        });
    }
}

<?php

namespace Kinderm8\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Laravel\Passport\Passport;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array
     */
    protected $policies = [
        // 'Kinderm8\Model' => 'Kinderm8\Policies\ModelPolicy',
    ];

    /**
     * Register any authentication / authorization services.
     *
     * @return void
     */
    public function boot()
    {
        $this->registerPolicies();

        Passport::loadKeysFrom(resource_path('oauth-secret-keys'));

        Passport::routes(function ($router)
        {
            $router->forAccessTokens();
            $router->forTransientTokens();
            //$router->forAuthorization();
            //$router->forClients();
            //$router->forPersonalAccessTokens();
        });

        Passport::tokensExpireIn(now()->addMinutes((int) config('passport-config.tokens_expire')));
        Passport::refreshTokensExpireIn(now()->addWeeks((int) config('passport-config.refresh_tokens_expire')));
        Passport::personalAccessTokensExpireIn(now()->addYears((int) config('passport-config.personal_access_tokens_expire')));

        //Passport::tokensExpireIn(now()->addSeconds(15));
        //Passport::refreshTokensExpireIn(now()->addSeconds(20));

        // Passport::enableImplicitGrant();

        // Implicitly grant "Super Admin" role all permissions
        /*Gate::before(function ($user, $ability)
        {
            return $user->hasRole('portal-admin') ? true : null;
        });*/
    }
}

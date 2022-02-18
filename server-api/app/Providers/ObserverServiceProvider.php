<?php

namespace Kinderm8\Providers;

use Illuminate\Support\ServiceProvider;
use Kinderm8\Observers\InvitationObserver;
use Kinderm8\UserInvitation;

class ObserverServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        UserInvitation::observe(InvitationObserver::class);
    }
}

<?php

namespace Kinderm8\Providers;

use Illuminate\Database\Events\TransactionRolledBack;
use Illuminate\Support\Facades\Event;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Kinderm8\Events\AuthLogEventHandler;
use Kinderm8\Events\BeforeInsertCheckEvent;
use Kinderm8\Events\updateSequenceOnRollBackEvent;
use Kinderm8\Listeners\AuthLogEvents;
use Kinderm8\Listeners\BeforeInsertCheckListener;
use Kinderm8\Listeners\PruneOldTokens;
use Kinderm8\Listeners\RevokeOldTokens;
use Kinderm8\Listeners\updateSequenceOnRollBackListener;
use Laravel\Passport\Events\AccessTokenCreated;
use Laravel\Passport\Events\RefreshTokenCreated;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event listener mappings for the application.
     *
     * @var array
     */
    protected $listen = [
        //
        AccessTokenCreated::class => [
            RevokeOldTokens::class
        ],
        RefreshTokenCreated::class => [
            PruneOldTokens::class
        ],
        //
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
        AuthLogEventHandler::class => [
            AuthLogEvents::class
        ],
        //
        BeforeInsertCheckEvent::class => [
            BeforeInsertCheckListener::class
        ],
        //
        /*TransactionRolledBack::class => [
            updateSequenceOnRollBackListener::class
        ],
        updateSequenceOnRollBackEvent::class => [
            updateSequenceOnRollBackListener::class
        ]*/
    ];

    /**
     * Register any events for your application.
     *
     * @return void
     */
    public function boot()
    {
        parent::boot();
    }
}

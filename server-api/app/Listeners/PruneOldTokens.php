<?php

namespace Kinderm8\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Laravel\Passport\Events\RefreshTokenCreated;
use Laravel\Passport\RefreshToken;

class PruneOldTokens
{
    /**
     * Create the event listener.
     *
     * @return void
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     *
     * @param  object  $event
     * @return void
     */
    public function handle(RefreshTokenCreated $event)
    {
        // delate all expired refresh tokens
        RefreshToken::where('expires_at', '<', now()->subDay())->delete();
    }
}

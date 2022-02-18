<?php

namespace Kinderm8;

use Laravel\Passport\Client;
use Rennokki\QueryCache\Traits\QueryCacheable;

class PassportOAuthClient extends Client
{
    use QueryCacheable;

    public $cacheFor = 3600 * 60 * 24; // cache time, in seconds

    /**
     * Invalidate the cache automatically
     * upon update in the database.
     */
    protected static $flushCacheOnUpdate = true;

    /**
     * Set the base cache tags that will be present
     * on all queries.
     *
     * @return array
     */
    protected function getCacheBaseTags(): array
    {
        return [];
    }
}

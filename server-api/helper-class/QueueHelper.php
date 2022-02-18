<?php

use Carbon\Carbon;

class QueueHelper
{
    const QUEUE_DELAY_TIME = 300;

    public static function getQueueDelayTime()
    {
        return Carbon::now()->addSeconds(self::QUEUE_DELAY_TIME);
    }

}
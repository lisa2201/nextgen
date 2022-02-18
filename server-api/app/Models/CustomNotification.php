<?php

namespace Kinderm8;

use Illuminate\Notifications\DatabaseNotification;

class CustomNotification extends DatabaseNotification
{
    protected $table = 'km8_notifications';
}

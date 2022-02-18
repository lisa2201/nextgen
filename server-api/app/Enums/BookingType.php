<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class BookingType extends Enum
{
    const STATUS_MAP = [
        '0' => 'booked',
        '1' => 'attendance',
        '2' => 'absence',
        '3' => 'holiday',
    ];
}

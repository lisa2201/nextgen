<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class BookingRequestType extends Enum
{
    const STATUS = [
        '0' => 'Pending',
        '1' => 'Accepted',
        '2' => 'rejected'
    ];

    const TYPE = [
        '0' => 'casual booking',
        '1' => 'standard booking',
        '2' => 'absence',
        '3' => 'holiday',
        '4' => 'late drop off',
        '5' => 'late pick up'
    ];
}

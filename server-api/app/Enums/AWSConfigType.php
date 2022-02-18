<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class AWSConfigType extends Enum
{
    const SNS = 'sns';
    const API_GATEWAY = 'end_points';
    const LAMBDA = 'lambda';
}

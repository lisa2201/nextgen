<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class CurrentGenConnectType extends Enum
{
    const ACTION_CREATE = 'new';
    const ACTION_UPDATE = 'update';
    const ACTION_DELETE = 'delete';

    const USER_SUBJECT = 'user';
    const CHILD_SUBJECT = 'child';
    const ROOM_SUBJECT = 'room';
    const ATTENDANCE_SUBJECT = 'attendance';
}

<?php

namespace Kinderm8\Enums;

use BenSampo\Enum\Enum;

final class RoleType extends Enum
{
    const SUPERADMIN = 'KM8-SA'; //portal
    const ORGADMIN = 'KM8-OA'; //site-manager
    const ADMINPORTAL = 'KM8-AP';
    const PARENTSPORTAL = 'KM8-PP';

    const OWNER = 'owner';
    const ROOT = 'root';

    const ADMINPORTAL_ROLE_LEVELS = ['administration', 'parent'];

    const ROLE_LEVELS = [
        //'ROOT' => self::SUPERADMIN,
        'OWNER' => self::ORGADMIN,
        'ADMINISTRATION' => self::ADMINPORTAL,
        'PARENT' => self::PARENTSPORTAL
    ];

    const PORTAL_ROLE_LEVELS_MAP = [
        self::ORGADMIN => 'site-manager',
        self::ADMINPORTAL => 'administration',
        self::PARENTSPORTAL => 'parent'
    ];

    const ADMIN_ROLE_LEVELS_MAP = [
        self::ADMINPORTAL => 'administration',
        self::PARENTSPORTAL => 'parent'
    ];

    const ADMINISTRATIVE_ROLE_LEVELS_MAP = [
        self::PARENTSPORTAL => 'parent'
    ];
}

<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'tax-access',
        'display_name' => 'View Tax Settings',
        'description' => null,
        'type' => 'Payment Tax',
        'navigation_ref_id' => 'N16',
        'access_level' => [
            RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

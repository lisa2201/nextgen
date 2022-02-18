<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'general-access',
        'display_name' => 'View General Settings',
        'description' => null,
        'type' => 'Settings',
        'navigation_ref_id' => 'N17',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'service-settings-access',
        'display_name' => 'View Service Settings',
        'description' => 'Display Service Settings',
        'type' => 'Service Settings',
        'navigation_ref_id' => 'N41',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

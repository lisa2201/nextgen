<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'finance-menu-access',
        'display_name' => 'Display Finance Menu',
        'description' => 'View Finance Menu',
        'type' => 'Finance',
        'navigation_ref_id' => 'N34',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

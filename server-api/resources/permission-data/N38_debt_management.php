<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'debt-management-access',
        'display_name' => 'View Debt Management',
        'description' => null,
        'type' => 'Debt Management',
        'navigation_ref_id' => 'N38',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

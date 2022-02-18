<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'balance-adjustments-access',
        'display_name' => 'Display Balance Adjustments',
        'description' => 'View Balance Adjustments',
        'type' => 'Balance Adjustments',
        'navigation_ref_id' => 'N35',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'balance-adjustments-create',
        'display_name' => 'Create Balance Adjustments',
        'description' => 'Create Balance Adjustments',
        'type' => 'Balance Adjustments',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ]
];

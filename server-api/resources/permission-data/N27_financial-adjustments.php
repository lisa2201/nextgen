<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'financial-adjustments-access',
        'display_name' => 'Display Financial Adjustments',
        'description' => 'View Financial Adjustments',
        'type' => 'Financial Adjustments',
        'navigation_ref_id' => 'N27',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'financial-adjustments-create',
        'display_name' => 'Create Financial Adjustments',
        'description' => 'Create Financial Adjustments',
        'type' => 'Financial Adjustments',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ]
];

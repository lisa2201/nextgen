<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'alternative-payment-arrangement-access',
        'display_name' => 'View Alternative Payment Arrangement',
        'description' => null,
        'type' => 'Alternative Payment Arrangement',
        'navigation_ref_id' => 'N39',
        'access_level' => [
             RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'alternative-payment-arrangement-create',
        'display_name' => 'Create Alternative Payment Arrangement',
        'description' => 'Create New Alternative Payment Arrangement',
        'type' => 'Alternative Payment Arrangement',
        'access_level' => [
             RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'alternative-payment-arrangement-edit',
        'display_name' => 'Edit Alternative Payment Arrangement',
        'description' => 'Edit Alternative Payment Arrangement',
        'type' => 'Alternative Payment Arrangement',
        'access_level' => [
             RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],

];

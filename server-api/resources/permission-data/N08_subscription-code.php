<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'subscription-code-access',
        'display_name' => 'Display Subscription Codes Listing',
        'description' => 'See only Listing Of Subscription Codes',
        'type' => 'Subscription Code',
        'navigation_ref_id' => 'N08',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'subscription-code-create',
        'display_name' => 'Create Subscription Code',
        'description' => 'Create New Subscription Code',
        'type' => 'Subscription Code',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'subscription-code-edit',
        'display_name' => 'Edit Subscription Code',
        'description' => 'Edit Subscription Code',
        'type' => 'Subscription Code',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'subscription-code-delete',
        'display_name' => 'Delete Subscription Code',
        'description' => 'Delete Subscription Code',
        'type' => 'Subscription Code',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

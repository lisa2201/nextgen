<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'payment-methods-access',
        'display_name' => 'View Payment Methods',
        'description' => 'View Payment Methods',
        'type' => 'Payment Methods',
        'navigation_ref_id' => 'N15',
        'access_level' => [
            RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'payment-methods-create',
        'display_name' => 'Create Payment Methods',
        'description' => 'Create Payment Methods',
        'type' => 'Payment Methods',
        'access_level' => [
            RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'payment-methods-edit',
        'display_name' => 'Edit Payment Methods',
        'description' => 'Edit Payment Methods',
        'type' => 'Payment Methods',
        'access_level' => [
            RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'payment-methods-delete',
        'display_name' => 'Delete Payment Methods',
        'description' => 'Delete Payment Methods',
        'type' => 'Payment Methods',
        'access_level' => [
            RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

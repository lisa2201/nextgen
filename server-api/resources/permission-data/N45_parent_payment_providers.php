<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-payment-providers-access',
        'display_name' => 'Display Parent Payment Provider',
        'description' => 'Display Parent Payment Provider',
        'type' => 'Parent Payment Provider',
        'navigation_ref_id' => 'N45',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'parent-payment-providers-create',
        'display_name' => 'Create Parent Payment Provider',
        'description' => 'Create Parent Payment Provider',
        'type' => 'Parent Payment Provider',
        'navigation_ref_id' => 'N45',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'parent-payment-providers-update',
        'display_name' => 'Update Parent Payment Provider',
        'description' => 'Update Parent Payment Provider',
        'type' => 'Parent Payment Provider',
        'navigation_ref_id' => 'N45',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'parent-payment-providers-delete',
        'display_name' => 'Delete Parent Payment Provider',
        'description' => 'Delete Parent Payment Provider',
        'type' => 'Parent Payment Provider',
        'navigation_ref_id' => 'N45',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

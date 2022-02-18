<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-payment-access',
        'display_name' => 'Display Parent Payments',
        'description' => 'Display Parent Payments',
        'type' => 'Parent Payments',
        'navigation_ref_id' => 'N43',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'parent-payment-create',
        'display_name' => 'Create Parent Payments',
        'description' => 'Create Parent Payments',
        'type' => 'Parent Payments',
        'navigation_ref_id' => 'N43',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'parent-payment-update',
        'display_name' => 'Update Parent Payments',
        'description' => 'Update Parent Payments',
        'type' => 'Parent Payments',
        'navigation_ref_id' => 'N43',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'parent-payment-delete',
        'display_name' => 'Delete Parent Payments',
        'description' => 'Delete Parent Payments',
        'type' => 'Parent Payments',
        'navigation_ref_id' => 'N43',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

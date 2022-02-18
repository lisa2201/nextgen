<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-finance-exclusion-access',
        'display_name' => 'Display Parent Finance Exclusions',
        'description' => 'Display Parent Finance Exclusions',
        'type' => 'Parent Finance Exclusion',
        'navigation_ref_id' => 'N58',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'parent-finance-exclusion-create',
        'display_name' => 'Create Parent Finance Exclusion',
        'description' => 'Create Parent Finance Exclusion',
        'type' => 'Parent Finance Exclusion',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'parent-finance-exclusion-update',
        'display_name' => 'Update Parent Finance Exclusion',
        'description' => 'Update Parent Finance Exclusion',
        'type' => 'Parent Finance Exclusion',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'parent-finance-exclusion-delete',
        'display_name' => 'Delete Parent Payments',
        'description' => 'Delete Parent Payments',
        'type' => 'Parent Finance Exclusion',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

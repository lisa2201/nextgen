<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'financial-adjustment-items-access',
        'display_name' => 'Display Financial Adjustment Items',
        'description' => 'View Financial Adjustment Items',
        'type' => 'Financial Adjustment Items',
        'navigation_ref_id' => 'N42',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'financial-adjustment-items-create',
        'display_name' => 'Create Financial Adjustment Items',
        'description' => 'Create Financial Adjustment Items',
        'type' => 'Financial Adjustment Items',
        'navigation_ref_id' => 'N42',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'financial-adjustment-items-update',
        'display_name' => 'Update Financial Adjustment Items',
        'description' => 'Update Financial Adjustment Items',
        'type' => 'Financial Adjustment Items',
        'navigation_ref_id' => 'N42',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'financial-adjustment-items-delete',
        'display_name' => 'Delete Financial Adjustment Items',
        'description' => 'Delete Financial Adjustment Items',
        'type' => 'Financial Adjustment Items',
        'navigation_ref_id' => 'N42',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

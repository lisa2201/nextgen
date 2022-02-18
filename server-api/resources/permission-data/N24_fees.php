<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'fees-access',
        'display_name' => 'Display Fees Listing',
        'description' => 'See only Listing Of Fees',
        'type' => 'Fees',
        'navigation_ref_id' => 'N24',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'fees-create',
        'display_name' => 'Create Fees',
        'description' => 'Create New Fees',
        'type' => 'Fees',
        'access_level' => [
             RoleType::ORGADMIN , RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'fees-edit',
        'display_name' => 'Edit Fees',
        'description' => 'Edit Fees',
        'type' => 'Fees',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'fees-delete',
        'display_name' => 'Delete Fees',
        'description' => 'Delete Fees',
        'type' => 'Fees',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
     [
        'name' => 'fees-adjust',
        'display_name' => 'Adjust Fees',
        'description' => 'Adjust Fees',
        'type' => 'Fees',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_ADJUST
    ],
     [
        'name' => 'fees-archive',
        'display_name' => 'Archive Fees',
        'description' => 'Archive Fees',
        'type' => 'Fees',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_ARCHIVE
    ],
];

<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'supplier-access',
        'display_name' => 'Display Supplier Listing',
        'description' => 'See only Listing Of Supplier',
        'type' => 'Supplier',
        'navigation_ref_id' => 'N64',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'supplier-create',
        'display_name' => 'Create Supplier',
        'description' => 'Create New Supplier',
        'type' => 'Supplier',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'supplier-edit',
        'display_name' => 'Edit Supplier',
        'description' => 'Edit Supplier',
        'type' => 'Supplier',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'supplier-delete',
        'display_name' => 'Delete Supplier',
        'description' => 'Delete Supplier',
        'type' => 'Supplier',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

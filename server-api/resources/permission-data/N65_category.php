<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'category-access',
        'display_name' => 'Display Category Listing',
        'description' => 'See only Listing Of Category',
        'type' => 'Category',
        'navigation_ref_id' => 'N65',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'category-create',
        'display_name' => 'Create Category',
        'description' => 'Create New Category',
        'type' => 'Category',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'category-edit',
        'display_name' => 'Edit Category',
        'description' => 'Edit Category',
        'type' => 'Category',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'category-delete',
        'display_name' => 'Delete Category',
        'description' => 'Delete Category',
        'type' => 'Category',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

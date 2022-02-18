<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'user-access',
        'display_name' => 'Display User Listing',
        'description' => 'See only Listing Of User',
        'type' => 'User',
        'navigation_ref_id' => 'N04',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'user-create',
        'display_name' => 'Create User',
        'description' => 'Create New User',
        'type' => 'User',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'user-edit',
        'display_name' => 'Edit User',
        'description' => 'Edit User',
        'type' => 'User',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'user-delete',
        'display_name' => 'Delete User',
        'description' => 'Delete User',
        'type' => 'User',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

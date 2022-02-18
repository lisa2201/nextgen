<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'role-access',
        'display_name' => 'Display Role Listing',
        'description' => 'See only Listing Of Role',
        'type' => 'Role',
        'navigation_ref_id' => 'N05',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'role-create',
        'display_name' => 'Create Role',
        'description' => 'Create New Role',
        'type' => 'Role',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'role-edit',
        'display_name' => 'Edit Role',
        'description' => 'Edit Role',
        'type' => 'Role',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'role-delete',
        'display_name' => 'Delete Role',
        'description' => 'Delete Role',
        'type' => 'Role',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'child-access',
        'display_name' => 'Display Child Listing',
        'description' => 'See only Listing Of Child',
        'type' => 'Child',
        'navigation_ref_id' => 'N07',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'child-create',
        'display_name' => 'Create Child',
        'description' => 'Create New Child',
        'type' => 'Child',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'child-edit',
        'display_name' => 'Edit Child',
        'description' => 'Edit Child',
        'type' => 'Child',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'child-delete',
        'display_name' => 'Delete Child',
        'description' => 'Delete Child',
        'type' => 'Child',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

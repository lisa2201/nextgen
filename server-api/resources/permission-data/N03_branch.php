<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'branch-access',
        'display_name' => 'Display Branch Listing',
        'description' => 'See only Listing Of Branch',
        'type' => 'Branch',
        'navigation_ref_id' => 'N03',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'branch-create',
        'display_name' => 'Create Branch',
        'description' => 'Create New Branch',
        'type' => 'Branch',
        'access_level' => [
             RoleType::ORGADMIN , RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'branch-edit',
        'display_name' => 'Edit Branch',
        'description' => 'Edit Branch',
        'type' => 'Branch',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'branch-delete',
        'display_name' => 'Delete Branch',
        'description' => 'Delete Branch',
        'type' => 'Branch',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

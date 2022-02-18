<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'permission-access',
        'display_name' => 'Display Permission Listing',
        'description' => 'See only Listing Of Permission',
        'type' => 'Permission',
        'navigation_ref_id' => 'N06',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'permission-create',
        'display_name' => 'Create Permission',
        'description' => 'Create New Permission',
        'type' => 'Permission',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
];

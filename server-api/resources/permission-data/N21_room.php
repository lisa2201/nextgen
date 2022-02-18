<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'room-access',
        'display_name' => 'Display Room Listing',
        'description' => 'See only Listing Of Rooms',
        'type' => 'Room',
        'navigation_ref_id' => 'N21',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'room-create',
        'display_name' => 'Create Room',
        'description' => 'Create New Room',
        'type' => 'Room',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'room-edit',
        'display_name' => 'Edit Room',
        'description' => 'Edit Room',
        'type' => 'Room',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'room-delete',
        'display_name' => 'Delete Room',
        'description' => 'Delete Room',
        'type' => 'Room',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

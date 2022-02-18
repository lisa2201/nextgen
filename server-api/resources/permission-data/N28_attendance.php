<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'attendance-access',
        'display_name' => 'Display Attendance Listing',
        'description' => 'See only Listing Of Attendance',
        'type' => 'Attendance',
        'navigation_ref_id' => 'N28',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'attendance-create',
        'display_name' => 'Create Attendance',
        'description' => 'Create New Attendance',
        'type' => 'Attendance',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'attendance-edit',
        'display_name' => 'Edit Attendance',
        'description' => 'Edit Attendance',
        'type' => 'Attendance',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'attendance-delete',
        'display_name' => 'Delete Attendance',
        'description' => 'Delete Attendance',
        'type' => 'Attendance',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

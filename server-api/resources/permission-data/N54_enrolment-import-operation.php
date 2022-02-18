<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'enrolment-import-operation-access',
        'display_name' => 'Display Enrolment Import View',
        'description' => null,
        'type' => 'Bulk Enrolment Import',
        'navigation_ref_id' => 'N54',
        'access_level' => [
            RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'enrolment-import-operation-save',
        'display_name' => 'Migrate Enrolments',
        'description' => null,
        'type' => 'Bulk Enrolment Import',
        'access_level' => [
            RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ]
];

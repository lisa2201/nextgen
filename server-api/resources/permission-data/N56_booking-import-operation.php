<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'booking-import-operation-access',
        'display_name' => 'Display Booking Import View',
        'description' => null,
        'type' => 'Bulk Booking Import',
        'navigation_ref_id' => 'N56',
        'access_level' => [
            RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'booking-import-operation-save',
        'display_name' => 'Migrate Bookings',
        'description' => null,
        'type' => 'Bulk Booking Import',
        'access_level' => [
            RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ]
];

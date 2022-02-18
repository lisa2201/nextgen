<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'booking-access',
        'display_name' => 'Display Booking Listing',
        'description' => 'See only Listing Of Booking',
        'type' => 'Child Booking',
        'navigation_ref_id' => 'N25',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'booking-create',
        'display_name' => 'Create Booking',
        'description' => 'Create New Booking',
        'type' => 'Child Booking',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [

        'name' => 'casual-booking-create',
        'display_name' => 'Create Casual Booking',
        'description' => 'Create Casual Booking from app',
        'type' => 'Child Booking',
        'access_level' => [
            RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'booking-edit',
        'display_name' => 'Edit Booking',
        'description' => 'Edit Booking',
        'type' => 'Child Booking',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'booking-delete',
        'display_name' => 'Delete Booking',
        'description' => 'Delete Booking',
        'type' => 'Child Booking',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

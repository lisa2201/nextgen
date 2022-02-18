<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'booking-request-access',
        'display_name' => 'Display Booking Request List',
        'description' => 'See Booking Requests',
        'type' => 'Child Booking Request',
        'navigation_ref_id' => 'N31',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'booking-request-create',
        'display_name' => 'Create Booking Request',
        'description' => 'Create New Booking Request',
        'type' => 'Child Booking Request',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'booking-request-edit',
        'display_name' => 'Edit Booking Request',
        'description' => 'Edit Booking Request',
        'type' => 'Child Booking Request',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'booking-request-delete',
        'display_name' => 'Delete Booking Request',
        'description' => 'Delete Booking Request',
        'type' => 'Child Booking Request',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

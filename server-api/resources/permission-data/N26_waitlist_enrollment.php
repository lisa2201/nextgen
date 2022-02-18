<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'waitlist-enrollment-access',
        'display_name' => 'View Waitlisted children',
        'description' => 'Waitlisted-children-list',
        'type' => 'Waitlist Enrollment',
        'navigation_ref_id' => 'N26',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'waitlist-child-create',
        'display_name' => 'Create Waitlist Child',
        'description' => 'Create New Child',
        'type' => 'Waitlist Enrollment',
        'navigation_ref_id' => 'N26',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'waitlist-edit',
        'display_name' => 'Edit Waitlist',
        'description' => 'Edit Waitlist',
        'type' => 'Waitlist Enrollment',
        'navigation_ref_id' => 'N26',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'waitlist-delete',
        'display_name' => 'Delete Waitlist',
        'description' => 'Delete Waitlisted Item',
        'type' => 'Waitlist Enrollment',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

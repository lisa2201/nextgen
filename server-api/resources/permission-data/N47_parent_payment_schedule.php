<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-payment-schedule-access',
        'display_name' => 'Display Parent Payment Schedule',
        'description' => 'Display Parent Payment Schedule',
        'type' => 'Parent Payment Schedule',
        'navigation_ref_id' => 'N47',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'parent-payment-schedule-create',
        'display_name' => 'Create Parent Payment Schedule',
        'description' => 'Create Parent Payment Schedule',
        'type' => 'Parent Payment Schedule',
        'navigation_ref_id' => 'N47',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'parent-payment-schedule-update',
        'display_name' => 'Update Parent Payment Schedule',
        'description' => 'Update Parent Payment Schedule',
        'type' => 'Parent Payment Schedule',
        'navigation_ref_id' => 'N47',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'parent-payment-schedule-delete',
        'display_name' => 'Delete Parent Payment Schedule',
        'description' => 'Delete Parent Payment Schedule',
        'type' => 'Parent Payment Schedule',
        'navigation_ref_id' => 'N47',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-payment-methods-access',
        'display_name' => 'Display Parent Payment Method',
        'description' => 'Display Parent Payment Method',
        'type' => 'Parent Payment Method',
        'navigation_ref_id' => 'N44',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'parent-payment-methods-create',
        'display_name' => 'Create Parent Payment Method',
        'description' => 'Create Parent Payment Method',
        'type' => 'Parent Payment Method',
        'navigation_ref_id' => 'N44',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'parent-payment-methods-update',
        'display_name' => 'Update Parent Payment Method',
        'description' => 'Update Parent Payment Method',
        'type' => 'Parent Payment Method',
        'navigation_ref_id' => 'N44',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'parent-payment-methods-delete',
        'display_name' => 'Delete Parent Payment Method',
        'description' => 'Delete Parent Payment Method',
        'type' => 'Parent Payment Method',
        'navigation_ref_id' => 'N44',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

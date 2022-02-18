<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-payment-terms-access',
        'display_name' => 'Display Parent Payment Terms',
        'description' => 'Display Parent Payment Terms',
        'type' => 'Parent Payment Terms',
        'navigation_ref_id' => 'N61',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'parent-payment-terms-create',
        'display_name' => 'Create Parent Payment Terms',
        'description' => 'Create Parent Payment Terms',
        'type' => 'Parent Payment Terms',
        'navigation_ref_id' => 'N61',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'parent-payment-terms-update',
        'display_name' => 'Update Parent Payment Terms',
        'description' => 'Update Parent Payment Terms',
        'type' => 'Parent Payment Terms',
        'navigation_ref_id' => 'N61',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'parent-payment-terms-delete',
        'display_name' => 'Delete Parent Payment Terms',
        'description' => 'Delete Parent Payment Terms',
        'type' => 'Parent Payment Terms',
        'navigation_ref_id' => 'N61',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

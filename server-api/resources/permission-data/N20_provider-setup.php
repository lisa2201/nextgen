<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'provider-setup-access',
        'display_name' => 'View Provider Setup',
        'description' => null,
        'type' => 'Provider Setup',
        'navigation_ref_id' => 'N20',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'provider-setup-edit',
        'display_name' => 'Edit Provider Setup',
        'description' => 'Edit Provider Setup',
        'type' => 'Provider Setup',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'provider-setup-delete',
        'display_name' => 'Delete Provider Setup',
        'description' => 'Delete Provider Setup',
        'type' => 'Provider Setup',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

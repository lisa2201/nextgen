<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parents-import-operation-access',
        'display_name' => 'Display Parents Import View',
        'description' => null,
        'type' => 'Bulk Parents Import',
        'navigation_ref_id' => 'N55',
        'access_level' => [
            RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'parents-import-operation-save',
        'display_name' => 'Migrate Parentss',
        'description' => null,
        'type' => 'Bulk Parents Import',
        'access_level' => [
            RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ]
];

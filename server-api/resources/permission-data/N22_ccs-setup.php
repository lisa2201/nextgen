<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'ccs_setup-access',
        'display_name' => 'Display CCS Listing',
        'description' => 'See only Listing Of CCS',
        'type' => 'CCS Setup',
        'navigation_ref_id' => 'N22',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'ccs_setup-create',
        'display_name' => 'Create CCS',
        'description' => 'Create New CCS',
        'type' => 'CCS Setup',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'ccs_setup-refresh',
        'display_name' => 'Refresh CCS',
        'description' => 'Refresh CCS',
        'type' => 'CCS Setup',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    // [
    //     'name' => 'ccs_setup-delete',
    //     'display_name' => 'Delete CCS',
    //     'description' => 'Delete CCS',
    //     'type' => 'CCS',
    //     'access_level' => [
    //         RoleType::ORGADMIN, RoleType::ADMINPORTAL
    //     ],
    //     'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    // ],
];

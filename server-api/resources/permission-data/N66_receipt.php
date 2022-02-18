<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'receipt-access',
        'display_name' => 'Display Receipt Listing',
        'description' => 'See only Listing Of Receipt',
        'type' => 'Receipt',
        'navigation_ref_id' => 'N66',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'receipt-create',
        'display_name' => 'Create Receipt',
        'description' => 'Create New Receipt',
        'type' => 'Receipt',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'receipt-edit',
        'display_name' => 'Edit Receipt',
        'description' => 'Edit Receipt',
        'type' => 'Receipt',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'receipt-delete',
        'display_name' => 'Delete Receipt',
        'description' => 'Delete Receipt',
        'type' => 'Receipt',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

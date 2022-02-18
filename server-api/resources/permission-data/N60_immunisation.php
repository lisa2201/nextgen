<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'immunisation-access',
        'display_name' => 'Display Immunisation Listing',
        'description' => 'See only Listing Of Immunisation',
        'type' => 'Immunisation',
        'navigation_ref_id' => 'N60',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL,RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'immunisation-create',
        'display_name' => 'Create Immunisation',
        'description' => 'Create New Immunisation',
        'type' => 'Immunisation',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'immunisation-edit',
        'display_name' => 'Edit Immunisation',
        'description' => 'Edit Immunisation',
        'type' => 'Immunisation',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'immunisation-delete',
        'display_name' => 'Delete Immunisation',
        'description' => 'Delete Immunisation',
        'type' => 'Immunisation',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

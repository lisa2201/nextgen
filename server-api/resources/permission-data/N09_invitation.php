<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'invitation-access',
        'display_name' => 'Display Invitation Listing',
        'description' => 'See only Listing Of Invitation',
        'type' => 'Invitation',
        'navigation_ref_id' => 'N09',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'invitation-create',
        'display_name' => 'Create Invitation',
        'description' => 'Create New Invitation',
        'type' => 'Invitation',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'invitation-edit',
        'display_name' => 'Edit Invitation',
        'description' => 'Edit Invitation',
        'type' => 'Invitation',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'invitation-delete',
        'display_name' => 'Delete Invitation',
        'description' => 'Delete Invitation',
        'type' => 'Invitation',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

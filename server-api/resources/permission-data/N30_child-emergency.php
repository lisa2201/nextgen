<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'child-emergency-access',
        'display_name' => 'Display Child Emergency Contacts',
        'description' => 'View emergency contacts of any Child',
        'type' => 'Child Emergency Contact',
        'navigation_ref_id' => 'N30',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'child-emergency-create',
        'display_name' => 'Create Child Emergency Contacts',
        'description' => 'Create a New Child Emergency Contact',
        'type' => 'Child Emergency Contact',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'child-emergency-edit',
        'display_name' => 'Edit Child Emergency Contacts',
        'description' => 'Edit a Child Emergency Contact',
        'type' => 'Child Emergency Contact',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'child-emergency-delete',
        'display_name' => 'Delete Child Emergency Contacts',
        'description' => 'Delete a Child Emergency Contact',
        'type' => 'Child Emergency Contact',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

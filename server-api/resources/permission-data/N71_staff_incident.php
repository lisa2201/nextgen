<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'staff-incident-access',
        'display_name' => 'View Staff Incident',
        'description' => 'View Staff Incident Form',
        'type' => 'Staff Incident',
        'navigation_ref_id' => 'N71',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'staff-incident-create',
        'display_name' => 'Create Staff Incident',
        'description' => 'Create Staff Incident Form',
        'type' => 'Staff Incident',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'staff-incident-edit',
        'display_name' => 'Edit Staff Incident',
        'description' => 'Edit Staff Incident Form',
        'type' => 'Staff Incident',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'staff-incident-delete',
        'display_name' => 'Delete Staff Incident',
        'description' => 'Delete Staff Incident Form',
        'type' => 'Staff Incident',
        'access_level' => [
           RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ]
];

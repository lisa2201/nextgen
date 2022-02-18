<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'health-medical-access',
        'display_name' => 'Display Health And Medical Deatails',
        'description' => 'See allergies, health and medical details',
        'type' => 'Child Health & Medical',
        'navigation_ref_id' => 'N29',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'health-medical-create',
        'display_name' => 'Create Health & Medical',
        'description' => 'Create New Health & Medical',
        'type' => 'Child Health & Medical',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'health-medical-edit',
        'display_name' => 'Edit Health & Medical',
        'description' => 'Edit Health & Medical',
        'type' => 'Child Health & Medical',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'health-medical-delete',
        'display_name' => 'Delete Health & Medical',
        'description' => 'Delete Health & Medical',
        'type' => 'Child Health & Medical',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

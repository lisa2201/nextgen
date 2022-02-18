<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'enrollment-master-access',
        'display_name' => 'Display Enrollment Dynamic Fields',
        'description' => 'See only dynamic filed for the branch manager own of defualt for branch manager',
        'type' => 'Enrollment-Master',
        'navigation_ref_id' => 'N57',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'enrollment-master-create',
        'display_name' => 'Create Enrollment Master Form',
        'description' => 'Create New Enrolment Form Formatfor Branch',
        'type' => 'Enrollment-Master',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'enrollment-master-edit',
        'display_name' => 'Edit Enrollment Master Form',
        'description' => 'Edit Invitation',
        'type' => 'Enrollment-Master',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'enrollment-master-delete',
        'display_name' => 'Delete  Master Form',
        'description' => 'Delete Enrollment',
        'type' => 'Enrollment-Master',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

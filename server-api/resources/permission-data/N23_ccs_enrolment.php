<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'ccs-enrolment-access',
        'display_name' => 'View CCS Enrolment',
        'description' => 'View CCS Enrolment',
        'type' => 'CCS Enrolment',
        'navigation_ref_id' => 'N23',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'ccs-enrolment-create',
        'display_name' => 'Create CCS Enrolment',
        'description' => 'Create New CCS Enrolment',
        'type' => 'CCS Enrolment',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'ccs-enrolment-edit',
        'display_name' => 'Edit CCS Enrolment',
        'description' => 'Edit CCS Enrolment',
        'type' => 'CCS Enrolment',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'ccs-enrolment-delete',
        'display_name' => 'Delete CCS Enrolment',
        'description' => 'Delete CCS Enrolment',
        'type' => 'CCS Enrolment',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
    [
        'name' => 'ccs-enrolment-submit',
        'display_name' => 'Submit CCS Enrolment',
        'description' => 'Submit New CCS Enrolment',
        'type' => 'CCS Enrolment',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_SUBMIT
    ],
];

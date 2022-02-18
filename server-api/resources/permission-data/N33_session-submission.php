<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'session-submission-access',
        'display_name' => 'Display Session Submission Listing',
        'description' => 'See only Listing Of Session Submission',
        'type' => 'Session Submission',
        'navigation_ref_id' => 'N33',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'session-submission-create',
        'display_name' => 'Create Session Submission',
        'description' => 'Create New Session Submission',
        'type' => 'Session Submission',
        'access_level' => [
            RoleType::ORGADMIN , RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'session-submission-delete',
        'display_name' => 'Delete Session Submission',
        'description' => 'Delete Session Submission',
        'type' => 'Session Submission',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
    [
        'name' => 'session-submission-withdraw',
        'display_name' => 'Withdrw Session Submission',
        'description' => 'Withdrw Session Submission',
        'type' => 'Session Submission',
        'access_level' => [
            RoleType::ORGADMIN , RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_WITHDRAW
    ],
];

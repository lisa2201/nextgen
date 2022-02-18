<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'reimbursements-access',
        'display_name' => 'Display Reimbursements Listing',
        'description' => 'See only Listing Of Reimbursements',
        'type' => 'Reimbursements',
        'navigation_ref_id' => 'N67',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'reimbursements-create',
        'display_name' => 'Create Reimbursements',
        'description' => 'Create New Reimbursements',
        'type' => 'Reimbursements',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'reimbursements-edit',
        'display_name' => 'Edit Reimbursements',
        'description' => 'Edit Reimbursements',
        'type' => 'Reimbursements',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'reimbursements-delete',
        'display_name' => 'Delete Reimbursements',
        'description' => 'Delete Reimbursements',
        'type' => 'Reimbursements',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

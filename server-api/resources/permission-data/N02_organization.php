<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'organization-access',
        'display_name' => 'Display Organization Listing',
        'description' => 'See only Listing Of Organization',
        'type' => 'Organization',
        'navigation_ref_id' => 'N02',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'organization-create',
        'display_name' => 'Create Organization',
        'description' => 'Create New Organization',
        'type' => 'Organization',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'organization-edit',
        'display_name' => 'Edit Organization',
        'description' => 'Edit Organization',
        'type' => 'Organization',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'organization-delete',
        'display_name' => 'Delete Organization',
        'description' => 'Delete Organization',
        'type' => 'Organization',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],

    //
    [
        'name' => 'subscription-approve',
        'display_name' => 'Approve Subscription',
        'description' => 'Approve New Subscription',
        'type' => 'Organization',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_APROVE
    ],
    [
        'name' => 'subscription-disapprove',
        'display_name' => 'Reject Subscription',
        'description' => 'Reject Subscription',
        'type' => 'Organization',
        'access_level' => [
             RoleType::SUPERADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DISAPROVE
    ],
];

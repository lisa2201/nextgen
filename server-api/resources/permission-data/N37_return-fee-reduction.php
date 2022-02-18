<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'return-fee-reduction-access',
        'display_name' => 'Display Return fee Reduction Listing',
        'description' => 'See only Listing Of Return Fee Reductions',
        'type' => 'Return Fee Reduction',
        'navigation_ref_id' => 'N37',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
    [
        'name' => 'return-fee-reduction-create',
        'display_name' => 'Create Return fee Reduction',
        'description' => 'Create New Return fee Reduction',
        'type' => 'Return Fee Reduction',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_CREATE
    ],
    [
        'name' => 'return-fee-reduction-edit',
        'display_name' => 'Edit Return fee Reduction',
        'description' => 'Edit Return fee Reduction',
        'type' => 'Return Fee Reduction',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],
    [
        'name' => 'return-fee-reduction-delete',
        'display_name' => 'Delete Return fee Reduction',
        'description' => 'Delete Return fee Reduction',
        'type' => 'Return Fee Reduction',
        'access_level' => [
            RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_DELETE
    ],
];

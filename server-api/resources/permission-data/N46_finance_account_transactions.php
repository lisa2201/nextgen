<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'financial-account-transactions-access',
        'display_name' => 'Display Parent Account Transactions',
        'description' => 'View Parent Account Transactions',
        'type' => 'Parent Account Transactions',
        'navigation_ref_id' => 'N46',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ]
];

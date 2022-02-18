<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'financial-account-access',
        'display_name' => 'Display Parent Accounts',
        'description' => 'View Parent Accounts',
        'type' => 'Parent Accounts',
        'navigation_ref_id' => 'N40',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ]
];

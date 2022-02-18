<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'petty-cash-menu-access',
        'display_name' => 'Display Petty Cash',
        'description' => 'View Petty Cash Menu',
        'type' => 'Petty Cash',
        'navigation_ref_id' => 'N63',
        'access_level' => [
            RoleType::ORGADMIN,RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

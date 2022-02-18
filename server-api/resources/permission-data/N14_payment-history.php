<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'history-access',
        'display_name' => 'View Payment History',
        'description' => null,
        'type' => 'Payment History',
        'navigation_ref_id' => 'N14',
        'access_level' => [
            RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

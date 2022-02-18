<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'bills-access',
        'display_name' => 'View Invoice History',
        'description' => null,
        'type' => 'Payment Bills',
        'navigation_ref_id' => 'N13',
        'access_level' => [
            RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

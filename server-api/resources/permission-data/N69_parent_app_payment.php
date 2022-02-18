<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-app-payment',
        'display_name' => 'Parent App - Payments',
        'description' => 'Parent App - Payments',
        'type' => 'Parent App - Payments',
        'navigation_ref_id' => 'N69',
        'access_level' => [
            RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

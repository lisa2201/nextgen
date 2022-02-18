<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-app-bookings',
        'display_name' => 'Parent App - Bookings',
        'description' => 'Parent App - Bookings',
        'type' => 'Parent App - Bookings',
        'navigation_ref_id' => 'N68',
        'access_level' => [
            RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

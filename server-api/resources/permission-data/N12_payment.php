<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'summary-access',
        'display_name' => 'Display Subscriber Payment Menu',
        'description' => 'View all Subscriber Payment Menu',
        'type' => 'Payment',
        'navigation_ref_id' => 'N12',
        'access_level' => [
            RoleType::ORGADMIN
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

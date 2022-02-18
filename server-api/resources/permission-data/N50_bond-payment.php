<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'bond-payment-access',
        'display_name' => 'Manage Bond Payment',
        'description' => 'Manage Bond Payment',
        'type' => 'Bond Payment',
        'navigation_ref_id' => 'N50',
        'access_level' => [
            RoleType::ADMINPORTAL, RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'contact reports',
        'display_name' => 'Manage Contact Reports',
        'description' => 'Manage Contact Reports',
        'type' => 'Contact Reports',
        'navigation_ref_id' => 'N52',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],

];

<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'report',
        'display_name' => 'Manage Reports',
        'description' => 'Manage Reports',
        'type' => 'Reports',
        'navigation_ref_id' => 'N51',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],

];

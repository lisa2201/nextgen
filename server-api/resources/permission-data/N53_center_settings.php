<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'center-settings',
        'display_name' => 'Edit Center Settings',
        'description' => 'Edit Center Settings',
        'type' => 'Center Settings',
        'navigation_ref_id' => 'N53',
        'access_level' => [
            RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_EDIT
    ],

];

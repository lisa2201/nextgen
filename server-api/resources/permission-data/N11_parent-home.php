<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'parent-home',
        'display_name' => 'Display Parent Home View',
        'description' => 'Display Parent Home View',
        'type' => 'Parent Poral Home',
        'navigation_ref_id' => 'N11',
        'access_level' => [
             RoleType::PARENTSPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];

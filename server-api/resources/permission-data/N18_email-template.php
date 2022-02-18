<?php

use Kinderm8\Enums\NavigationActionType;
use Kinderm8\Enums\RoleType;

return [
    [
        'name' => 'email-templates-access',
        'display_name' => 'View Email Template Settings',
        'description' => null,
        'type' => 'Email Template Settings',
        'navigation_ref_id' => 'N18',
        'access_level' => [
             RoleType::ORGADMIN, RoleType::ADMINPORTAL
        ],
        'perm_slug' => NavigationActionType::ACTION_TYPE_VIEW
    ],
];
